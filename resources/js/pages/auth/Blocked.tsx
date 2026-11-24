import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Copy,
    CreditCard,
    FileText,
    LogOut,
    MessageCircle,
    PhoneCall,
    ShieldAlert,
    User,
} from 'lucide-react';

interface Props {
    user: {
        id: number;
        name: string;
        username: string;
        email: string;
        phone: string | null;
        blocked_reason: string | null;
        blocked_at: string | null;
    };
    fine: {
        id: number;
        tracking_id: string;
        fine_amount: number;
        mistake_details: string;
        created_at: string;
        status: string;
    } | null;
    bkash: {
        number: string;
        type: string;
        account_name: string;
    };
    hr_contact: {
        name: string;
        phone: string;
        whatsapp: string;
        support_hours: string;
    };
}

export default function Blocked({ user, fine, bkash, hr_contact }: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopyNumber = () => {
        if (!bkash?.number) return;
        navigator.clipboard.writeText(bkash.number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    const whatsappMessage = encodeURIComponent(
        `আসসালামু আলাইকুম, আমি ${user.name} (ইউজারনেম: ${user.username})। আমার অ্যাকাউন্ট স্থগিত আছে। জরিমানা পরিশোধ করে আইডি আনব্লক করতে চাই। ট্র্যাকিং কোড: ${fine?.tracking_id || 'N/A'}`
    );

    const whatsappUrl = `https://wa.me/${hr_contact.whatsapp.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;

    const reasonText = user.blocked_reason || fine?.mistake_details || 'হেড অফিস কর্তৃক স্থগিতাদেশ প্রদান করা হয়েছে।';
    const fineAmount = fine ? Number(fine.fine_amount) : 0;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-rose-500 selection:text-white">
            <Head title="অ্যাকাউন্ট স্থগিত (Blocked)" />

            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-sm">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                                MisLoan
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                                Account Restricted
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        লগআউট
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6 my-auto">
                {/* Status Hero Card */}
                <div className="bg-white rounded-3xl border border-rose-200 shadow-md p-6 sm:p-8 text-center space-y-3 relative overflow-hidden">
                    <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center mx-auto shadow-sm">
                        <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-rose-950 tracking-tight">
                        আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত (Blocked)
                    </h1>

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>ইউজার: <strong>{user.name}</strong> (@{user.username})</span>
                    </div>
                </div>

                {/* REASON & FINE SECTION - LARGE & CONCISE TEXT */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-6 sm:p-8 space-y-6">
                    {/* Reason Box with BIG TEXT */}
                    <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
                            স্থগিতাদেশের কারণ (ভুলের বিবরণ):
                        </span>
                        <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200">
                            <p className="text-lg sm:text-xl font-bold text-rose-950 leading-relaxed whitespace-pre-wrap">
                                {reasonText}
                            </p>
                        </div>
                    </div>

                    {/* Fine Amount & Reference in 2-cols */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    ধার্যকৃত জরিমানা
                                </span>
                                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                                    ৳ {fineAmount.toLocaleString('en-US')}
                                    <span className="text-xs font-semibold text-slate-500 ml-1">টাকা</span>
                                </div>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                                <CreditCard className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    ট্র্যাকিং কোড
                                </span>
                                <div className="text-lg sm:text-xl font-mono font-bold text-slate-800 mt-1">
                                    {fine?.tracking_id || 'N/A'}
                                </div>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                <FileText className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* bKash Payment Card - Clean & Light */}
                    <div className="bg-pink-50/60 border border-pink-200/80 rounded-2xl p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <span className="text-xs font-bold text-pink-700 uppercase tracking-wider block">
                                    বিকাশ পেমেন্ট নাম্বার ({bkash.type || 'Payment'})
                                </span>
                                <span className="text-2xl font-mono font-extrabold text-slate-900 tracking-wider mt-0.5 block">
                                    {bkash.number || '01XXXXXXXXX'}
                                </span>
                                <span className="text-xs text-slate-500 block">
                                    {bkash.account_name}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleCopyNumber}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#E2136E] text-white text-xs font-bold hover:bg-[#c90f5f] shadow-md shadow-pink-600/20 transition-all active:scale-95 self-start sm:self-auto"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        কপি হয়েছে!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        নাম্বার কপি করুন
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="text-xs text-pink-900 border-t border-pink-200/70 pt-2 font-medium">
                            ⚠️ শুধুমাত্র বিকাশ <strong>Payment (মার্চেন্ট পেমেন্ট)</strong> ব্যবহার করে টাকা পরিশোধ করুন।
                        </div>
                    </div>
                </div>

                {/* HR SUPPORT & UNBLOCK ACTIONS */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                            <PhoneCall className="w-5 h-5 text-emerald-600" />
                            এইচআর (HR) যোগাযোগ ও আনব্লক করার নিয়ম
                        </h2>
                        <p className="text-xs text-emerald-800 mt-1">
                            জরিমানা পেমেন্ট সম্পন্ন করে নিচের নম্বরে HR এর সাথে যোগাযোগ করলে আপনার অ্যাকাউন্ট তাৎক্ষণিকভাবে সচল করে দেওয়া হবে।
                        </p>
                    </div>

                    {/* Direct Call & WhatsApp Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <a
                            href={`tel:${hr_contact.phone}`}
                            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold text-sm hover:bg-slate-50 shadow-sm transition-all active:scale-98"
                        >
                            <PhoneCall className="w-4 h-4 text-emerald-600" />
                            কল করুন: {hr_contact.phone}
                        </a>

                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#25D366] text-white font-bold text-sm hover:bg-[#20ba59] shadow-md shadow-emerald-700/20 transition-all active:scale-98"
                        >
                            <MessageCircle className="w-4 h-4" />
                            হোয়াটসঅ্যাপে মেসেজ পাঠান
                        </a>
                    </div>

                    <div className="text-center text-[11px] text-slate-500 pt-1">
                        অফিস সময়: {hr_contact.support_hours || 'সকাল ৯:০০ - সন্ধ্যা ৬:০০'}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 py-4">
                &copy; {new Date().getFullYear()} Mousumi MIS Loan System
            </footer>
        </div>
    );
}
