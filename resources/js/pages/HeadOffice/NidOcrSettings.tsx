import AdminLayout from '@/layouts/admin-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Activity,
    CheckCircle2,
    Cpu,
    KeyRound,
    Link2,
    Power,
    Save,
    ScanLine,
    Server,
    Sparkles,
    XCircle,
    Zap,
} from 'lucide-react';
import React, { useState } from 'react';

type OcrProvider = 'auto' | 'groq' | 'openrouter' | 'gemini' | 'python_service' | 'local';

interface Props {
    settings: {
        enabled: boolean;
        provider: OcrProvider;
        service_url: string;
        has_token: boolean;
        has_gemini_key: boolean;
        gemini_model: string;
        has_groq_key: boolean;
        groq_model: string;
        has_openrouter_key: boolean;
        openrouter_model: string;
        timeout: number;
    };
}

export default function NidOcrSettings({ settings }: Props) {
    const page = usePage<{ flash?: { success?: string | null; error?: string | null } }>();
    const flashSuccess = page.props.flash?.success;

    const { data, setData, put, processing, errors } = useForm({
        enabled: settings.enabled,
        provider: settings.provider,
        service_url: settings.service_url || '',
        service_token: '',
        clear_token: false,
        gemini_api_key: '',
        clear_gemini_key: false,
        gemini_model: settings.gemini_model || 'gemini-3.8-flash',
        groq_api_key: '',
        clear_groq_key: false,
        groq_model: settings.groq_model || 'meta-llama/llama-4-scout-17b-16e-instruct',
        openrouter_api_key: '',
        clear_openrouter_key: false,
        openrouter_model: settings.openrouter_model || 'qwen/qwen2.5-vl-72b-instruct:free',
        timeout: settings.timeout || 30,
    });

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        ok: boolean;
        message: string;
    } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/head-office/nid-ocr-settings', {
            preserveScroll: true,
        });
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post('/head-office/nid-ocr-settings/test-connection', {
                service_url: data.service_url,
                service_token: data.service_token || undefined,
            });
            setTestResult({
                ok: Boolean(res.data?.ok),
                message: res.data?.message || 'কানেকশন সফল!',
            });
        } catch (err: any) {
            setTestResult({
                ok: false,
                message: err?.response?.data?.message || 'সার্ভারে সংযোগ পাওয়া যায়নি।',
            });
        } finally {
            setTesting(false);
        }
    };

    const showGroqSection = data.provider === 'groq' || data.provider === 'auto';
    const showOpenRouterSection = data.provider === 'openrouter' || data.provider === 'auto';
    const showGeminiSection = data.provider === 'gemini' || data.provider === 'auto';
    const showPythonSection = data.provider === 'python_service' || data.provider === 'auto';

    return (
        <AdminLayout>
            <Head title="Settings — NID OCR" />

            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                {/* Header */}
                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
                            <ScanLine className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight">
                                Settings — NID OCR ও ফ্রি API রোটেশন
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                                Groq → OpenRouter → Gemini অটো-সুইচিং অথবা External Python / Local OCR সেট করুন
                            </p>
                        </div>
                    </div>

                    <div
                        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold ${
                            data.enabled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                        }`}
                    >
                        <Power className="h-3.5 w-3.5" />
                        <span>{data.enabled ? 'OCR চালু আছে (ON)' : 'OCR বন্ধ আছে (OFF)'}</span>
                    </div>
                </div>

                {flashSuccess && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span>{flashSuccess}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Master ON/OFF Toggle */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                Member Admission-এ NID OCR চালু রাখুন
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                বন্ধ (OFF) করলে Field Officer সরাসরি আগের মতো নতুন/পুরাতন ফর্ম পূরণ করতে পারবেন, NID স্ক্যান ধাপ আসবে না।
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={data.enabled}
                            onClick={() => setData('enabled', !data.enabled)}
                            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                data.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ${
                                    data.enabled ? 'translate-x-6' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Provider Mode */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                OCR ইঞ্জিন মোড নির্বাচন করুন
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                <strong>Auto</strong> মোডে একটি API কাজ না করলে বা কোটা শেষ হলে সাথে সাথেই পরেরটিতে (1. Groq → 2. OpenRouter → 3. Gemini) সুইচ করবে।
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[
                                {
                                    id: 'auto' as const,
                                    title: 'Auto Rotation (Recommended)',
                                    desc: '1. Groq → 2. OpenRouter → 3. Gemini (একটি ব্যর্থ হলে পরেরটিতে সুইচ)',
                                },
                                {
                                    id: 'groq' as const,
                                    title: '1. Groq Vision Only',
                                    desc: 'শুধু Groq ফ্রি Vision API ব্যবহার করবে (~০.৮s)',
                                },
                                {
                                    id: 'openrouter' as const,
                                    title: '2. OpenRouter Free Only',
                                    desc: 'শুধু OpenRouter ফ্রি Vision মডেল ব্যবহার করবে',
                                },
                                {
                                    id: 'gemini' as const,
                                    title: '3. Gemini Free Only',
                                    desc: 'শুধু Gemini Vision AI ব্যবহার করবে (PDF সাপোর্টসহ)',
                                },
                                {
                                    id: 'python_service' as const,
                                    title: 'External Python API',
                                    desc: 'আপনার আলাদা হোস্ট করা Python OCR সার্ভার ব্যবহার করবে',
                                },
                                {
                                    id: 'local' as const,
                                    title: 'Local OCR (Offline)',
                                    desc: 'কোনো API ছাড়াই ব্রাউজারে অফলাইন OCR চালাবে',
                                },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setData('provider', opt.id)}
                                    className={`rounded-xl border-2 p-3.5 text-left transition ${
                                        data.provider === opt.id
                                            ? 'border-blue-600 bg-blue-50/70'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                                        {opt.title}
                                    </div>
                                    <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                        {opt.desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 1. Groq Vision Section */}
                    {showGroqSection && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-orange-600" />
                                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                        ১. Groq Vision API (ফ্রি — console.groq.com)
                                    </h2>
                                </div>
                                <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800">
                                    Priority #1
                                </span>
                            </div>

                            <div className="space-y-2">
                                <label className="mb-1 block text-xs font-bold text-slate-700">
                                    Groq API Key{' '}
                                    {settings.has_groq_key && !data.clear_groq_key && (
                                        <span className="text-emerald-600 font-semibold">(সংরক্ষিত আছে)</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="password"
                                        placeholder={
                                            settings.has_groq_key
                                                ? 'পরিবর্তন করতে চাইলে নতুন Key দিন'
                                                : 'gsk_...'
                                        }
                                        value={data.groq_api_key}
                                        onChange={(e) => {
                                            setData('groq_api_key', e.target.value);
                                            if (e.target.value) setData('clear_groq_key', false);
                                        }}
                                        className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    সেরা Vision মডেল সিস্টেম নিজেই অটো সিলেক্ট করে নেবে।
                                </p>
                                {settings.has_groq_key && (
                                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.clear_groq_key}
                                            onChange={(e) => setData('clear_groq_key', e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <span>Groq API Key মুছে ফেলুন</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 2. OpenRouter Vision Section */}
                    {showOpenRouterSection && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-purple-600" />
                                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                        ২. OpenRouter Free Vision (openrouter.ai)
                                    </h2>
                                </div>
                                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">
                                    Priority #2
                                </span>
                            </div>

                            <div className="space-y-2">
                                <label className="mb-1 block text-xs font-bold text-slate-700">
                                    OpenRouter API Key{' '}
                                    {settings.has_openrouter_key && !data.clear_openrouter_key && (
                                        <span className="text-emerald-600 font-semibold">(সংরক্ষিত আছে)</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="password"
                                        placeholder={
                                            settings.has_openrouter_key
                                                ? 'পরিবর্তন করতে চাইলে নতুন Key দিন'
                                                : 'sk-or-v1-...'
                                        }
                                        value={data.openrouter_api_key}
                                        onChange={(e) => {
                                            setData('openrouter_api_key', e.target.value);
                                            if (e.target.value) setData('clear_openrouter_key', false);
                                        }}
                                        className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    ফ্রি Vision মডেল সিস্টেম নিজেই অটো সিলেক্ট ও রোটেট করবে।
                                </p>
                                {settings.has_openrouter_key && (
                                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.clear_openrouter_key}
                                            onChange={(e) => setData('clear_openrouter_key', e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <span>OpenRouter API Key মুছে ফেলুন</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 3. Gemini Vision AI Section */}
                    {showGeminiSection && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-blue-600" />
                                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                        ৩. Gemini Vision AI (aistudio.google.com)
                                    </h2>
                                </div>
                                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
                                    Priority #3
                                </span>
                            </div>

                            <div className="space-y-2">
                                <label className="mb-1 block text-xs font-bold text-slate-700">
                                    Gemini API Key{' '}
                                    {settings.has_gemini_key && !data.clear_gemini_key && (
                                        <span className="text-emerald-600 font-semibold">(সংরক্ষিত আছে)</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="password"
                                        placeholder={
                                            settings.has_gemini_key
                                                ? 'পরিবর্তন করতে চাইলে নতুন Key দিন'
                                                : 'AIzaSy... (খালি রাখলে .env ব্যবহার হবে)'
                                        }
                                        value={data.gemini_api_key}
                                        onChange={(e) => {
                                            setData('gemini_api_key', e.target.value);
                                            if (e.target.value) setData('clear_gemini_key', false);
                                        }}
                                        className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    সেরা Gemini Flash মডেল সিস্টেম নিজেই অটো সিলেক্ট ও ফলব্যাক করবে।
                                </p>
                                {settings.has_gemini_key && (
                                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.clear_gemini_key}
                                            onChange={(e) => setData('clear_gemini_key', e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <span>ডাটাবেজের Key মুছে .env ব্যবহার করুন</span>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* External Python Service Connection */}
                    {showPythonSection && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            <div className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-indigo-600" />
                                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                                    External Python NID OCR API কানেকশন (ঐচ্ছিক)
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-bold text-slate-700">
                                        Service Base URL <span className="text-slate-400 font-normal">(শেষে `/` ছাড়া)</span>
                                    </label>
                                    <div className="relative">
                                        <Link2 className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="url"
                                            placeholder="https://ocr.yourdomain.com অথবা http://127.0.0.1:8001"
                                            value={data.service_url}
                                            onChange={(e) => setData('service_url', e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    {errors.service_url && (
                                        <p className="mt-1 text-xs text-red-600 font-medium">{errors.service_url}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-700">
                                        Bearer Secret Token{' '}
                                        {settings.has_token && !data.clear_token && (
                                            <span className="text-emerald-600 font-semibold">(সংরক্ষিত আছে)</span>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                        <input
                                            type="password"
                                            placeholder={
                                                settings.has_token
                                                    ? 'পরিবর্তন করতে চাইলে নতুন টোকেন দিন'
                                                    : 'NID_OCR_TOKEN দিন'
                                            }
                                            value={data.service_token}
                                            onChange={(e) => {
                                                setData('service_token', e.target.value);
                                                if (e.target.value) setData('clear_token', false);
                                            }}
                                            className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    {settings.has_token && (
                                        <label className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={data.clear_token}
                                                onChange={(e) => setData('clear_token', e.target.checked)}
                                                className="rounded border-slate-300"
                                            />
                                            <span>সংরক্ষিত টোকেন মুছে ফেলুন</span>
                                        </label>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold text-slate-700">
                                        Request Timeout (সেকেন্ড)
                                    </label>
                                    <input
                                        type="number"
                                        min={5}
                                        max={120}
                                        value={data.timeout}
                                        onChange={(e) => setData('timeout', Number(e.target.value) || 30)}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                    {errors.timeout && (
                                        <p className="mt-1 text-xs text-red-600 font-medium">{errors.timeout}</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleTestConnection}
                                    disabled={testing || !data.service_url}
                                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 text-xs font-bold text-indigo-800 disabled:opacity-50 transition"
                                >
                                    <Activity className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
                                    <span>{testing ? 'চেক করা হচ্ছে...' : 'Test Connection (/health)'}</span>
                                </button>

                                {testResult && (
                                    <div
                                        className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                                            testResult.ok ? 'text-emerald-700' : 'text-red-600'
                                        }`}
                                    >
                                        {testResult.ok ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <XCircle className="h-4 w-4" />
                                        )}
                                        <span>{testResult.message}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Local Offline Note */}
                    {data.provider === 'local' && (
                        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-950">
                            <Cpu className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed">
                                <strong>Local OCR (Offline)</strong> মোডে কোনো এক্সটার্নাল সার্ভার বা API Key ছাড়াই ব্যবহারকারীর ব্রাউজারে Tesseract (`ben+eng`) রান হবে। সর্বোচ্চ বাংলা নির্ভুলতার জন্য Auto Rotation (Groq / OpenRouter / Gemini) ব্যবহারের পরামর্শ দেওয়া হয়।
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-extrabold text-white shadow-md disabled:opacity-50 transition"
                        >
                            <Save className="h-4 w-4" />
                            <span>{processing ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
