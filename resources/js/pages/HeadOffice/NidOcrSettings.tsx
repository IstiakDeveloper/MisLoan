import AdminLayout from '@/layouts/admin-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Activity,
    ArrowDown,
    ArrowUp,
    Check,
    CheckCircle2,
    KeyRound,
    Link2,
    Power,
    Save,
    ScanLine,
    XCircle,
} from 'lucide-react';
import React, { useState } from 'react';

type EngineId = 'google_vision' | 'openrouter' | 'gemini' | 'groq' | 'python_service' | 'local';

interface Props {
    settings: {
        enabled: boolean;
        mode: 'single' | 'multiple';
        provider: EngineId;
        providers: EngineId[];
        service_url: string;
        has_token: boolean;
        has_gemini_key: boolean;
        has_groq_key: boolean;
        has_openrouter_key: boolean;
        has_google_vision_key: boolean;
        timeout: number;
    };
}

const ENGINES: Array<{ id: EngineId; name: string; subtitle: string; badge?: string }> = [
    { id: 'google_vision', name: 'Google Cloud Vision', subtitle: 'সবচেয়ে নির্ভুল বাংলা+ইংরেজি (১,০০০/মাস ফ্রি)', badge: 'Best' },
    { id: 'openrouter', name: 'OpenRouter Free', subtitle: 'ফ্রি ভিশন মডেল অটো-রোটেশন' },
    { id: 'gemini', name: 'Gemini Vision AI', subtitle: 'ফ্রি টিয়ার ও PDF সাপোর্ট' },
    { id: 'groq', name: 'Groq Vision', subtitle: 'ফাস্ট ভিশন API (অ্যাকাউন্টে মডেল থাকলে)' },
    { id: 'python_service', name: 'External Python API', subtitle: 'নিজস্ব হোস্ট করা FastAPI সার্ভার' },
    { id: 'local', name: 'Local Offline OCR', subtitle: 'কোনো API ছাড়াই ব্রাউজারে অফলাইন' },
];

export default function NidOcrSettings({ settings }: Props) {
    const page = usePage<{ flash?: { success?: string | null; error?: string | null } }>();
    const flashSuccess = page.props.flash?.success;

    const { data, setData, put, processing, errors } = useForm({
        enabled: settings.enabled,
        mode: settings.mode || 'multiple',
        provider: settings.provider || 'google_vision',
        providers: settings.providers?.length ? settings.providers : (['google_vision', 'openrouter', 'gemini'] as EngineId[]),
        service_url: settings.service_url || '',
        service_token: '',
        clear_token: false,
        gemini_api_key: '',
        clear_gemini_key: false,
        groq_api_key: '',
        clear_groq_key: false,
        openrouter_api_key: '',
        clear_openrouter_key: false,
        google_vision_api_key: '',
        clear_google_vision_key: false,
        timeout: settings.timeout || 30,
    });

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

    const activeEngines: EngineId[] =
        data.mode === 'single' ? [data.provider] : data.providers;

    const isSelected = (id: EngineId) => activeEngines.includes(id);

    const toggleProvider = (id: EngineId) => {
        if (data.mode === 'single') {
            setData('provider', id);
            return;
        }
        const exists = data.providers.includes(id);
        if (exists) {
            if (data.providers.length === 1) return; // keep at least 1
            setData('providers', data.providers.filter((p) => p !== id));
        } else {
            setData('providers', [...data.providers, id]);
        }
    };

    const moveProvider = (id: EngineId, dir: -1 | 1) => {
        const idx = data.providers.indexOf(id);
        const nextIdx = idx + dir;
        if (idx < 0 || nextIdx < 0 || nextIdx >= data.providers.length) return;
        const next = [...data.providers];
        [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
        setData('providers', next);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/head-office/nid-ocr-settings', { preserveScroll: true });
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await axios.post('/head-office/nid-ocr-settings/test-connection', {
                service_url: data.service_url,
                service_token: data.service_token || undefined,
            });
            setTestResult({ ok: Boolean(res.data?.ok), message: res.data?.message || 'কানেকশন সফল!' });
        } catch (err: any) {
            setTestResult({
                ok: false,
                message: err?.response?.data?.message || 'সার্ভারে সংযোগ পাওয়া যায়নি।',
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <AdminLayout>
            <Head title="Settings — NID OCR" />

            <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
                {/* Minimal Header + Master ON/OFF */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shrink-0">
                            <ScanLine className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-lg font-extrabold text-slate-900">
                                NID OCR Settings
                            </h1>
                            <p className="text-xs text-slate-500">
                                Single অথবা Multiple OCR ইঞ্জিন ও ক্রেডেনশিয়াল সেট করুন
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={data.enabled}
                        onClick={() => setData('enabled', !data.enabled)}
                        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                            data.enabled
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                        <Power className="h-3.5 w-3.5" />
                        <span>{data.enabled ? 'ON' : 'OFF'}</span>
                    </button>
                </div>

                {flashSuccess && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{flashSuccess}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Mode Toggle + Engine Picker */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">১. মোড ও ইঞ্জিন নির্বাচন</h2>
                                <p className="text-xs text-slate-500">
                                    {data.mode === 'single'
                                        ? 'শুধু নির্বাচিত ১টি ইঞ্জিনই কাজ করবে'
                                        : 'একাধিক ইঞ্জিন সিলেক্ট করলে ক্রমানুসারে অটো-সুইচ করবে'}
                                </p>
                            </div>

                            <div className="inline-flex rounded-xl bg-slate-100 p-1 self-start">
                                <button
                                    type="button"
                                    onClick={() => setData('mode', 'single')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                        data.mode === 'single'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Single
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setData('mode', 'multiple')}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                        data.mode === 'multiple'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    Multiple
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {ENGINES.map((engine) => {
                                const selected = isSelected(engine.id);
                                const orderIdx = data.mode === 'multiple' ? data.providers.indexOf(engine.id) : -1;
                                return (
                                    <div
                                        key={engine.id}
                                        onClick={() => toggleProvider(engine.id)}
                                        className={`cursor-pointer rounded-xl border p-3 transition flex items-center justify-between gap-2 ${
                                            selected
                                                ? 'border-blue-600 bg-blue-50/50'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                                                    data.mode === 'single' ? 'rounded-full' : 'rounded-md'
                                                } border ${
                                                    selected
                                                        ? 'border-blue-600 bg-blue-600 text-white'
                                                        : 'border-slate-300 bg-white'
                                                }`}
                                            >
                                                {selected && <Check className="h-3 w-3" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-slate-900 truncate">
                                                        {engine.name}
                                                    </span>
                                                    {engine.badge && (
                                                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                                            {engine.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate">{engine.subtitle}</p>
                                            </div>
                                        </div>

                                        {data.mode === 'multiple' && selected && (
                                            <div
                                                className="flex items-center gap-1 shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                                                    #{orderIdx + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    disabled={orderIdx === 0}
                                                    onClick={() => moveProvider(engine.id, -1)}
                                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                                    title="উপরে নিন"
                                                >
                                                    <ArrowUp className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={orderIdx === data.providers.length - 1}
                                                    onClick={() => moveProvider(engine.id, 1)}
                                                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                                    title="নিচে নিন"
                                                >
                                                    <ArrowDown className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {errors.providers && (
                            <p className="text-xs font-medium text-red-600">{errors.providers}</p>
                        )}
                    </div>

                    {/* Credentials for ONLY selected engines */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                        <h2 className="text-sm font-bold text-slate-900">২. নির্বাচিত ইঞ্জিনের ক্রেডেনশিয়াল</h2>

                        {isSelected('google_vision') && (
                            <div className="space-y-1.5 rounded-xl border border-slate-200 p-3.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Google Cloud Vision API Key{' '}
                                    {settings.has_google_vision_key && !data.clear_google_vision_key && (
                                        <span className="text-emerald-600 font-semibold">(সংরক্ষিত)</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="password"
                                        placeholder={settings.has_google_vision_key ? 'নতুন Key দিলে পরিবর্তন হবে' : 'AIzaSy...'}
                                        value={data.google_vision_api_key}
                                        onChange={(e) => {
                                            setData('google_vision_api_key', e.target.value);
                                            if (e.target.value) setData('clear_google_vision_key', false);
                                        }}
                                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                {settings.has_google_vision_key && (
                                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.clear_google_vision_key}
                                            onChange={(e) => setData('clear_google_vision_key', e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <span>সংরক্ষিত Key মুছে ফেলুন</span>
                                    </label>
                                )}
                            </div>
                        )}

                        {isSelected('openrouter') && (
                            <div className="space-y-1.5 rounded-xl border border-slate-200 p-3.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    OpenRouter API Key{' '}
                                    {settings.has_openrouter_key && !data.clear_openrouter_key && (
                                        <span className="text-emerald-600 font-semibold">(সংরক্ষিত)</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="password"
                                        placeholder={settings.has_openrouter_key ? 'নতুন Key দিলে পরিবর্তন হবে' : 'sk-or-v1-...'}
                                        value={data.openrouter_api_key}
                                        onChange={(e) => {
                                            setData('openrouter_api_key', e.target.value);
                                            if (e.target.value) setData('clear_openrouter_key', false);
                                        }}
                                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                {settings.has_openrouter_key && (
                                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.clear_openrouter_key}
                                            onChange={(e) => setData('clear_openrouter_key', e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <span>সংরক্ষিত Key মুছে ফেলুন</span>
                                    </label>
                                )}
                            </div>
                        )}

                        {isSelected('gemini') && (
                            <div className="space-y-1.5 rounded-xl border border-slate-200 p-3.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Gemini API Key{' '}
                                    {settings.has_gemini_key && !data.clear_gemini_key && (
                                        <span className="text-emerald-600 font-semibold">(সংরক্ষিত)</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="password"
                                        placeholder={settings.has_gemini_key ? 'নতুন Key দিলে পরিবর্তন হবে' : 'AIzaSy...'}
                                        value={data.gemini_api_key}
                                        onChange={(e) => {
                                            setData('gemini_api_key', e.target.value);
                                            if (e.target.value) setData('clear_gemini_key', false);
                                        }}
                                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                {settings.has_gemini_key && (
                                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.clear_gemini_key}
                                            onChange={(e) => setData('clear_gemini_key', e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <span>সংরক্ষিত Key মুছে ফেলুন</span>
                                    </label>
                                )}
                            </div>
                        )}

                        {isSelected('groq') && (
                            <div className="space-y-1.5 rounded-xl border border-slate-200 p-3.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Groq API Key{' '}
                                    {settings.has_groq_key && !data.clear_groq_key && (
                                        <span className="text-emerald-600 font-semibold">(সংরক্ষিত)</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="password"
                                        placeholder={settings.has_groq_key ? 'নতুন Key দিলে পরিবর্তন হবে' : 'gsk_...'}
                                        value={data.groq_api_key}
                                        onChange={(e) => {
                                            setData('groq_api_key', e.target.value);
                                            if (e.target.value) setData('clear_groq_key', false);
                                        }}
                                        className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                {settings.has_groq_key && (
                                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.clear_groq_key}
                                            onChange={(e) => setData('clear_groq_key', e.target.checked)}
                                            className="rounded border-slate-300"
                                        />
                                        <span>সংরক্ষিত Key মুছে ফেলুন</span>
                                    </label>
                                )}
                            </div>
                        )}

                        {isSelected('python_service') && (
                            <div className="space-y-3 rounded-xl border border-slate-200 p-3.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-xs font-bold text-slate-700">
                                            External Python API URL
                                        </label>
                                        <div className="relative">
                                            <Link2 className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                                            <input
                                                type="url"
                                                placeholder="http://127.0.0.1:8001"
                                                value={data.service_url}
                                                onChange={(e) => setData('service_url', e.target.value)}
                                                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs sm:text-sm"
                                            />
                                        </div>
                                        {errors.service_url && (
                                            <p className="mt-1 text-xs text-red-600">{errors.service_url}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">
                                            Bearer Token {settings.has_token && <span className="text-emerald-600">(সংরক্ষিত)</span>}
                                        </label>
                                        <input
                                            type="password"
                                            placeholder={settings.has_token ? 'নতুন টোকেন দিলে পরিবর্তন হবে' : 'NID_OCR_TOKEN'}
                                            value={data.service_token}
                                            onChange={(e) => {
                                                setData('service_token', e.target.value);
                                                if (e.target.value) setData('clear_token', false);
                                            }}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold text-slate-700">Timeout (sec)</label>
                                        <input
                                            type="number"
                                            min={5}
                                            max={120}
                                            value={data.timeout}
                                            onChange={(e) => setData('timeout', Number(e.target.value) || 30)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={testing || !data.service_url}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                                    >
                                        <Activity className={`h-3.5 w-3.5 ${testing ? 'animate-pulse' : ''}`} />
                                        <span>{testing ? 'চেক হচ্ছে...' : 'Test Connection'}</span>
                                    </button>
                                    {testResult && (
                                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${testResult.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                                            {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                            {testResult.message}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeEngines.length === 1 && activeEngines[0] === 'local' && (
                            <p className="text-xs text-slate-500">
                                Local Offline OCR-এ কোনো API Key প্রয়োজন নেই।
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm disabled:opacity-50 transition"
                        >
                            <Save className="h-4 w-4" />
                            <span>{processing ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সেভ করুন'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
