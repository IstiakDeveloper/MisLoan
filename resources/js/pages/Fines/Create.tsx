import { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Copy,
    CreditCard,
    FileText,
    HelpCircle,
    Info,
    Smartphone,
    Upload,
    X,
    ShieldAlert,
    Clock,
} from 'lucide-react';

interface Props {
    bkash: {
        number: string;
        type: string;
        account_name: string;
    };
    defaultFee: number;
    categories: string[];
}

export default function Create({ bkash, defaultFee, categories }: Props) {
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [copied, setCopied] = useState(false);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        category: categories[0] || 'অন্যান্য সাধারণ ভুল (Other Operational Mistake)',
        mistake_details: '',
        correction_details: '',
        payment_phone: '',
        transaction_id: '',
        screenshot: null as File | null,
    });

    const handleCopyNumber = () => {
        if (!bkash?.number) return;
        navigator.clipboard.writeText(bkash.number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('screenshot', file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setScreenshotPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeScreenshot = () => {
        setData('screenshot', null);
        setScreenshotPreview(null);
    };

    const validateStep1 = () => {
        if (!data.category) return false;
        if (data.mistake_details.trim().length < 10) return false;
        if (data.correction_details.trim().length < 10) return false;
        return true;
    };

    const handleProceedToStep2 = () => {
        if (validateStep1()) {
            clearErrors();
            setCurrentStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/fines', {
            forceFormData: true,
            onError: (errs) => {
                // If step 1 fields failed, move back to step 1
                if (errs.mistake_details || errs.correction_details || errs.category) {
                    setCurrentStep(1);
                }
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="ভুল সংশোধন ও জরিমানা আবেদন" />

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                href="/fines"
                                className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                ভুল সংশোধন ও জরিমানা আবেদন
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 ml-11">
                            আপনার কাজের কোনো তথ্য ভুল হলে তা বিস্তারিত লিখে জরিমানা পরিশোধ সাপেক্ষে সংশোধনের আবেদন করুন।
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Link
                            href="/fines"
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
                        >
                            <FileText className="w-4 h-4 text-slate-400" />
                            পূর্ববর্তী আবেদনসমূহ
                        </Link>
                    </div>
                </div>

                {/* Modern Stepper Indicator */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 relative">
                        {/* Step 1 Tab */}
                        <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className={`flex items-center gap-3.5 p-3 rounded-xl transition-all text-left ${
                                currentStep === 1
                                    ? 'bg-blue-50/80 border border-blue-200 text-blue-900 shadow-sm'
                                    : 'hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                                    currentStep === 1
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                        : validateStep1()
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >
                                {validateStep1() && currentStep !== 1 ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    '১'
                                )}
                            </div>
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    প্রথম ধাপ
                                </span>
                                <span className="text-sm font-semibold text-slate-800">
                                    ভুল ও সংশোধনের বিবরণ
                                </span>
                            </div>
                        </button>

                        {/* Step 2 Tab */}
                        <button
                            type="button"
                            onClick={() => validateStep1() && setCurrentStep(2)}
                            disabled={!validateStep1()}
                            className={`flex items-center gap-3.5 p-3 rounded-xl transition-all text-left ${
                                currentStep === 2
                                    ? 'bg-pink-50/80 border border-pink-200 text-pink-900 shadow-sm'
                                    : !validateStep1()
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                                    currentStep === 2
                                        ? 'bg-[#E2136E] text-white shadow-md shadow-pink-500/20'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >
                                ২
                            </div>
                            <div>
                                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    দ্বিতীয় ধাপ
                                </span>
                                <span className="text-sm font-semibold text-slate-800">
                                    বিকাশ পেমেন্ট ও তথ্য যাচাই
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Form Container */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* STEP 1: Mistake and Correction Details */}
                    {currentStep === 1 && (
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        ভুল ও সংশোধনের বিবরণ প্রদান করুন
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        আপনি কি ভুল করেছেন এবং কি সংশোধন করতে চান তা বিস্তারিত লিখুন।
                                    </p>
                                </div>
                            </div>

                            {/* Category Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-800">
                                    ভুলের ধরণ / বিষয় <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                                {errors.category && (
                                    <p className="text-xs text-red-600 font-medium">{errors.category}</p>
                                )}
                            </div>

                            {/* Mistake Details */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-semibold text-slate-800">
                                        কি কি ভুল হয়েছে? (Mistake Details) <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-[11px] text-slate-400">
                                        কমপক্ষে ১০ অক্ষর ({data.mistake_details.length}/১০)
                                    </span>
                                </div>
                                <textarea
                                    rows={4}
                                    value={data.mistake_details}
                                    onChange={(e) => setData('mistake_details', e.target.value)}
                                    placeholder="উদাহরণ: সদস্য ভর্তি করার সময় ভুলবশত জাতীয় পরিচয়পত্র নম্বর এবং মোবাইল নাম্বার ভুল টাইপ করা হয়েছিল..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                />
                                {errors.mistake_details && (
                                    <p className="text-xs text-red-600 font-medium">{errors.mistake_details}</p>
                                )}
                            </div>

                            {/* Correction Details */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-semibold text-slate-800">
                                        কি কি ঠিক করতে চান? (Required Corrections) <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-[11px] text-slate-400">
                                        কমপক্ষে ১০ অক্ষর ({data.correction_details.length}/১০)
                                    </span>
                                </div>
                                <textarea
                                    rows={4}
                                    value={data.correction_details}
                                    onChange={(e) => setData('correction_details', e.target.value)}
                                    placeholder="উদাহরণ: জাতীয় পরিচয়পত্র নম্বর হবে '১৯৯২০০...', এবং সঠিক মোবাইল নম্বর হবে '০১৭XXXXXXXX'..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                />
                                {errors.correction_details && (
                                    <p className="text-xs text-red-600 font-medium">{errors.correction_details}</p>
                                )}
                            </div>

                            {/* Guidance Note */}
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
                                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-900 leading-relaxed">
                                    <strong className="font-semibold">বিশেষ দ্রষ্টব্য:</strong> ভুল সংশোধনের জন্য নির্ধারিত জরিমানা ফি হচ্ছে{' '}
                                    <span className="font-bold text-amber-950">৳ {defaultFee} টাকা</span>। পরবর্তী ধাপে গিয়ে বিকাশের মাধ্যমে পেমেন্ট সম্পন্ন করে ট্রানজেকশন প্রুফ আপলোড করতে হবে।
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={handleProceedToStep2}
                                    disabled={!validateStep1()}
                                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                                        validateStep1()
                                            ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 hover:shadow-lg'
                                            : 'bg-slate-300 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    পরবর্তী ধাপ: পেমেন্ট করুন
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: bKash Payment & Proof Verification */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* BKASH SPECIAL PAYMENT NOTICE BANNER - LIGHT THEME */}
                            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-pink-200/90 shadow-sm relative overflow-hidden space-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1.5">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 text-xs font-bold uppercase tracking-wider text-pink-700">
                                            <ShieldAlert className="w-4 h-4 text-pink-600" />
                                            জরুরি পেমেন্ট নির্দেশিকা
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                            শুধুমাত্র বিকাশ <span className="text-[#E2136E] underline decoration-pink-300 decoration-wavy decoration-2">Payment</span> এর মাধ্যমে ফি দিন
                                        </h3>
                                        <p className="text-slate-600 text-sm">
                                            বিকাশ অ্যাপের <strong>&quot;Make Payment&quot;</strong> অপশন ব্যবহার করুন। কোনো পার্সোনাল Send Money গ্রহণযোগ্য নয়।
                                        </p>
                                    </div>

                                    <div className="bg-pink-50 border border-pink-200/80 rounded-2xl p-4 text-center min-w-[150px]">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                            জরিমানা ফি
                                        </span>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
                                            ৳ {defaultFee}
                                            <span className="text-xs font-semibold text-slate-500 ml-1">টাকা</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Number Box */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                            অফিসিয়াল বিকাশ নাম্বার ({bkash.type || 'Payment'})
                                        </span>
                                        <span className="text-2xl font-mono font-extrabold text-slate-900 tracking-wider">
                                            {bkash.number || '01XXXXXXXXX'}
                                        </span>
                                        <span className="text-xs text-slate-500 block">
                                            {bkash.account_name}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCopyNumber}
                                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E2136E] text-white text-xs font-bold hover:bg-[#c90f5f] shadow-md shadow-pink-600/20 transition-all active:scale-95"
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
                            </div>

                            {/* Proof Verification Form */}
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="w-9 h-9 rounded-xl bg-pink-100 text-[#E2136E] flex items-center justify-center font-bold">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">
                                            পেমেন্ট তথ্য ও স্ক্রিনশট সাবমিট করুন
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            যাচাইকরণের সুবিধার্থে যে নাম্বার থেকে পেমেন্ট করেছেন তা এবং ট্রানজেকশন স্ক্রিনশট দিন।
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    {/* Sender Phone Number */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-800">
                                            প্রেরক বিকাশ মোবাইল নাম্বার <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.payment_phone}
                                            onChange={(e) => setData('payment_phone', e.target.value)}
                                            placeholder="017XXXXXXXX"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 font-mono transition-all"
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            যে বিকাশ অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন সেই ১১ ডিজিটের নাম্বার
                                        </p>
                                        {errors.payment_phone && (
                                            <p className="text-xs text-red-600 font-medium">{errors.payment_phone}</p>
                                        )}
                                    </div>

                                    {/* Transaction ID */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-sm font-semibold text-slate-800">
                                                বিকাশ ট্রানজেকশন আইডি (TrxID)
                                            </label>
                                            <span className="text-[11px] text-slate-400 font-medium">ঐচ্ছিক</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={data.transaction_id}
                                            onChange={(e) => setData('transaction_id', e.target.value.toUpperCase())}
                                            placeholder="যেমন: BKG789XXXX (না থাকলে ফাঁকা রাখুন)"
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 font-mono uppercase tracking-wider transition-all"
                                        />
                                        <p className="text-[11px] text-slate-400">
                                            এসএমএস বা রসিদে থাকা TrxID (থাকলে দিন, না থাকলেও আবেদন জমা দেওয়া যাবে)
                                        </p>
                                        {errors.transaction_id && (
                                            <p className="text-xs text-red-600 font-medium">{errors.transaction_id}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Screenshot Upload */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-800">
                                        পেমেন্ট স্লিপের স্ক্রিনশট আপলোড <span className="text-red-500">*</span>
                                    </label>

                                    {!screenshotPreview ? (
                                        <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100/70 transition-all group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-pink-600 group-hover:scale-110 transition-all mb-3">
                                                    <Upload className="w-6 h-6" />
                                                </div>
                                                <p className="mb-1 text-sm font-semibold text-slate-700">
                                                    ক্লিক করে স্ক্রিনশট ফাইল নির্বাচন করুন
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    অথবা ড্র্যাগ করে এখানে এনে ছাড়ুন (JPG, PNG, WEBP — সর্বোচ্চ ৪ MB)
                                                </p>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-2xl border border-slate-200 p-3 bg-slate-50 flex items-center gap-4">
                                            <img
                                                src={screenshotPreview}
                                                alt="Screenshot Preview"
                                                className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    স্ক্রিনশট সংযুক্ত করা হয়েছে
                                                </div>
                                                <p className="text-xs text-slate-500 truncate mt-1">
                                                    {data.screenshot?.name}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {data.screenshot && (data.screenshot.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeScreenshot}
                                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors mr-2"
                                                title="মুছে ফেলুন"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                    {errors.screenshot && (
                                        <p className="text-xs text-red-600 font-medium">{errors.screenshot}</p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(1)}
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        পূর্ববর্তী ধাপে ফিরুন
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={processing || !data.payment_phone || !data.screenshot}
                                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-md ${
                                            processing || !data.payment_phone || !data.screenshot
                                                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                                : 'bg-[#E2136E] hover:bg-[#c90f5f] shadow-pink-600/20 hover:shadow-lg'
                                        }`}
                                    >
                                        {processing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                আবেদন জমা হচ্ছে...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                আবেদন ও পেমেন্ট নিশ্চিত করুন
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </AdminLayout>
    );
}
