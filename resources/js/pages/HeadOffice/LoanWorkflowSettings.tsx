import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import {
    SlidersHorizontal,
    Save,
    RotateCcw,
    CheckCircle2,
    ShieldCheck,
    FileText,
    Users,
    Info,
    AlertTriangle,
    Coins,
    Layers,
    FileCheck,
    FileSpreadsheet,
    FileSignature,
} from 'lucide-react';

import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
} from '@/components/configuration';
import AdminLayout from '@/layouts/admin-layout';

interface ConfigData {
    bm_approval_ceiling: number;
    sufolon_agreement_max: number;
    guarantor_min_amount: number;
    bm_investigation_ceiling: number;
    monthly_investigation_max: number;
    weekly_approval_form_min_amount: number | null;
    role_ceilings: Record<string, number | null>;
    defaults: {
        bm_approval_ceiling: number;
        sufolon_agreement_max: number;
        guarantor_min_amount: number;
        bm_investigation_ceiling: number;
        monthly_investigation_max: number;
        weekly_approval_form_min_amount: number | null;
        role_ceilings: Record<string, number | null>;
    };
}

interface Props {
    config: ConfigData;
    roleLabels: Record<string, string>;
    canManage: boolean;
}

export default function LoanWorkflowSettings({ config, roleLabels, canManage }: Props) {
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const form = useForm({
        bm_approval_ceiling: config.bm_approval_ceiling,
        sufolon_agreement_max: config.sufolon_agreement_max,
        guarantor_min_amount: config.guarantor_min_amount,
        bm_investigation_ceiling: config.bm_investigation_ceiling,
        monthly_investigation_max: config.monthly_investigation_max,
        weekly_approval_form_min_amount: config.weekly_approval_form_min_amount ?? '',
        role_ceilings: {
            area_manager: config.role_ceilings?.area_manager ?? '',
            zone_manager: config.role_ceilings?.zone_manager ?? '',
            admf: config.role_ceilings?.admf ?? '',
            dmf: config.role_ceilings?.dmf ?? '',
            ed: config.role_ceilings?.ed ?? '',
        } as Record<string, string | number>,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) return;

        form.put('/head-office/loan-workflow-settings', {
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        setIsResetting(true);
        router.post('/head-office/loan-workflow-settings/reset', {}, {
            preserveScroll: true,
            onFinish: () => {
                setIsResetting(false);
                setShowResetConfirm(false);
            },
        });
    };

    const higherRoles = [
        { key: 'area_manager', defaultVal: 'সীমাহীন (Unlimited)' },
        { key: 'zone_manager', defaultVal: 'সীমাহীন (Unlimited)' },
        { key: 'admf', defaultVal: 'সীমাহীন (Unlimited)' },
        { key: 'dmf', defaultVal: 'সীমাহীন (Unlimited)' },
        { key: 'ed', defaultVal: 'সীমাহীন (Unlimited)' },
    ];

    const systemForms = [
        { id: 1, name: 'ঋণ চুক্তিপত্র', pages: '১ পৃষ্ঠা', rule: 'সাপ্তাহিক ঋণ ও সুফলন ঋণ (≤ ৯৯,০০০ টাকা)' },
        { id: 2, name: 'জামিনদার অঙ্গীকার', pages: '১ পৃষ্ঠা', rule: 'ঋণের পরিমাণ ≥ ২০,০০০ টাকা (বিতরণের পূর্বে)' },
        { id: 3, name: 'মৃত্যুঝুঁকি তহবিল', pages: '১ পৃষ্ঠা', rule: 'সকল ঋণের জন্য বিতরণের পূর্বে বাধ্যতামূলক' },
        { id: 4, name: 'সরেজমিন তদন্ত প্রতিবেদন', pages: '১ পৃষ্ঠা', rule: 'ব্রাঞ্চ ম্যানেজার অনুমোদনের পূর্বে (< ৭০,০০০ টাকা)' },
        { id: 5, name: 'ঋণ আবেদন ও অনুমোদন ফরম', pages: '৪ পৃষ্ঠা', badge: '৪-পৃষ্ঠা ফরম', rule: 'মাসিক ঋণ (জাগরণ, বুনিয়াদ, অগ্রসর) ও সুফলন (> ৯৯,০০০ টাকা)' },
    ];

    return (
        <AdminLayout>
            <Head title="ঋণ অনুমোদন ও ফরম সেটিংস" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="ঋণ অনুমোদন ও ফরম কনফিগারেশন"
                    description="কোন পদে কত টাকা পর্যন্ত ঋণের সরাসরি অনুমোদন ক্ষমতা থাকবে এবং কোন পরিমাণের জন্য ৪ পৃষ্ঠার অনুমোদন ফরম সহ কোন কোন ফরম প্রযোজ্য হবে তা ডায়নামিকভাবে নিয়ন্ত্রণ করুন।"
                    icon={SlidersHorizontal}
                    actions={
                        canManage && (
                            <button
                                type="button"
                                onClick={() => setShowResetConfirm(true)}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                            >
                                <RotateCcw className="size-4" />
                                ডিফল্ট রিসেট করুন
                            </button>
                        )
                    }
                />

                {/* System Forms Overview Bar */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                    <div className="mb-3 flex items-center gap-2 text-slate-800">
                        <Layers className="size-4 text-blue-600" />
                        <h2 className="text-sm font-bold">
                            সিস্টেমে বিদ্যমান ৫টি ঋণ ফরমের তালিকা ও বর্তমান নিয়ম
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                        {systemForms.map((sf) => (
                            <div
                                key={sf.id}
                                className={`rounded-xl border p-3 transition ${
                                    sf.id === 5
                                        ? 'border-purple-200 bg-purple-50/60 ring-1 ring-purple-100'
                                        : 'border-slate-200 bg-slate-50/60'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                                        ফরম {sf.id}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            sf.id === 5
                                                ? 'bg-purple-600 text-white shadow-2xs'
                                                : 'bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        {sf.pages}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs font-bold text-slate-900">
                                    {sf.name}
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                                    {sf.rule}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
                        {/* Left Column: Form Fields */}
                        <div className="space-y-6">
                            {/* Section 1: Approval Ceilings */}
                            <ConfigurationCard>
                                <div className="border-b border-slate-100 p-5 sm:p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                            <ShieldCheck className="size-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900">
                                                অনুমোদন ক্ষমতা ও সিলিং (Approval Ceilings)
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                কোন পদে কত টাকা পর্যন্ত ঋণের সরাসরি অনুমোদন করার এখতিয়ার থাকবে।
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5 p-5 sm:p-6">
                                    {/* BM Approval Ceiling */}
                                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <label
                                                    htmlFor="bm_approval_ceiling"
                                                    className="text-sm font-bold text-slate-900"
                                                >
                                                    ব্রাঞ্চ ম্যানেজার (Branch Manager) সরাসরি অনুমোদন সীমা (টাকা)
                                                </label>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    ঋণের পরিমাণ এই সীমার নিচে থাকলে BM সরাসরি অনুমোদন করতে পারবেন। এই টাকার সমান বা বেশি হলে বাধ্যতামূলক উর্ধ্বতন কর্মকর্তার কাছে Forward করতে হবে এবং টিম-ভিত্তিক অনুমোদন শিট তৈরি হবে।
                                                </p>
                                            </div>
                                            <div className="shrink-0 sm:w-44">
                                                <div className="relative">
                                                    <input
                                                        id="bm_approval_ceiling"
                                                        type="number"
                                                        step="1000"
                                                        min="0"
                                                        value={form.data.bm_approval_ceiling}
                                                        disabled={!canManage || form.processing}
                                                        onChange={(e) =>
                                                            form.setData('bm_approval_ceiling', Number(e.target.value))
                                                        }
                                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 pr-8 text-base font-bold text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                                                    />
                                                    <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                                                        ৳
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    ডিফল্ট: ৳{config.defaults.bm_approval_ceiling.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        {form.errors.bm_approval_ceiling && (
                                            <p className="mt-2 text-xs font-semibold text-rose-600">
                                                {form.errors.bm_approval_ceiling}
                                            </p>
                                        )}
                                    </div>

                                    {/* Higher Approvers */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Users className="size-4 text-slate-500" />
                                            <h3 className="text-sm font-bold text-slate-800">
                                                উর্ধ্বতন কর্মকর্তাদের অনুমোদন সীমা (ঐচ্ছিক)
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            উর্ধ্বতন কর্মকর্তাদের জন্য সর্বোচ্চ কোনো সীমা প্রয়োগ করতে চাইলে টাকা নির্ধারণ করুন। খালি বা ০ রাখলে তারা যে কোনো অংকের ঋণ অনুমোদন করতে পারবেন।
                                        </p>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {higherRoles.map(({ key }) => {
                                                const label = roleLabels[key] || key;
                                                const val = form.data.role_ceilings[key] ?? '';

                                                return (
                                                    <div
                                                        key={key}
                                                        className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs"
                                                    >
                                                        <label
                                                            htmlFor={`role_${key}`}
                                                            className="block text-xs font-bold text-slate-800"
                                                        >
                                                            {label}
                                                        </label>
                                                        <div className="relative mt-2">
                                                            <input
                                                                id={`role_${key}`}
                                                                type="number"
                                                                step="5000"
                                                                min="0"
                                                                placeholder="সীমাহীন (Unlimited)"
                                                                value={val}
                                                                disabled={!canManage || form.processing}
                                                                onChange={(e) => {
                                                                    const updated = {
                                                                        ...form.data.role_ceilings,
                                                                        [key]: e.target.value === '' ? '' : Number(e.target.value),
                                                                    };
                                                                    form.setData('role_ceilings', updated);
                                                                }}
                                                                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-semibold text-slate-900 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                                            />
                                                            <span className="pointer-events-none absolute right-2.5 top-2 text-xs font-semibold text-slate-400">
                                                                ৳
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </ConfigurationCard>

                            {/* Section 2: Form Rules & Requirements */}
                            <ConfigurationCard>
                                <div className="border-b border-slate-100 p-5 sm:p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-100">
                                            <FileSpreadsheet className="size-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900">
                                                ঋণ ফরম রুলস ও শর্তাবলী (Form Rules & Thresholds)
                                            </h2>
                                            <p className="text-xs text-slate-500">
                                                ৪ পৃষ্ঠার ঋণ আবেদন ও অনুমোদন ফরম সহ কোন পরিমাণের জন্য কোন ফরমটি প্রযোজ্য হবে তার নিয়ম।
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5 p-5 sm:p-6">
                                    {/* 4-Page Loan Approval Form Card */}
                                    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-md bg-purple-600 px-2 py-0.5 text-xs font-bold text-white">
                                                        ফরম ৫
                                                    </span>
                                                    <h3 className="text-sm font-bold text-purple-950">
                                                        ঋণ আবেদন ও অনুমোদন ফরম (৪ পৃষ্ঠা) - জাগরণ / বুনিয়াদ / অগ্রসর
                                                    </h3>
                                                </div>
                                                <p className="mt-2 text-xs leading-relaxed text-purple-900/80">
                                                    <strong>বর্তমান সিস্টেমের নিয়ম:</strong> সকল <strong>মাসিক কিস্তির ঋণের</strong> (জাগরণ, বুনিয়াদ ও অগ্রসর) জন্য শুরু থেকেই এই ৪ পৃষ্ঠার বিস্তারিত অনুমোদন ফরমটি পূরণ করতে হয়। সুফলন ঋণের ক্ষেত্রে ঋণ চুক্তিপত্রের সীমা (৯৯,০০০ টাকা) অতিক্রম করলে এটি সুফলন প্রোফাইল আকারে আসে।
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 border-t border-purple-200/60 pt-3">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <label
                                                        htmlFor="weekly_approval_form_min_amount"
                                                        className="text-xs font-bold text-purple-950"
                                                    >
                                                        সাপ্তাহিক ঋণের ক্ষেত্রেও কি ৪ পৃষ্ঠার ফরম প্রযোজ্য করবেন? (ঐচ্ছিক টাকার সীমা)
                                                    </label>
                                                    <p className="text-[11px] text-purple-800/80">
                                                        সাপ্তাহিক ঋণ নির্দিষ্ট টাকার বেশি হলে (যেমন: ৫০,০০০ বা ১,০০,০০০ টাকা) ৪ পৃষ্ঠার ফরম চাইলে টাকা লিখুন। <strong>খালি রাখলে বর্তমান নিয়মে সাপ্তাহিক ঋণে ফরম ১ (ঋণ চুক্তিপত্র) বহাল থাকবে।</strong>
                                                    </p>
                                                </div>
                                                <div className="shrink-0 sm:w-44">
                                                    <div className="relative">
                                                        <input
                                                            id="weekly_approval_form_min_amount"
                                                            type="number"
                                                            step="5000"
                                                            min="0"
                                                            placeholder="ডিফল্ট: প্রযোজ্য নয়"
                                                            value={form.data.weekly_approval_form_min_amount}
                                                            disabled={!canManage || form.processing}
                                                            onChange={(e) =>
                                                                form.setData('weekly_approval_form_min_amount', e.target.value === '' ? '' : Number(e.target.value))
                                                            }
                                                            className="h-9 w-full rounded-lg border border-purple-300 bg-white px-3 pr-8 text-sm font-bold text-slate-900 shadow-2xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 disabled:bg-slate-50"
                                                        />
                                                        <span className="pointer-events-none absolute right-2.5 top-2 text-xs font-semibold text-slate-400">
                                                            ৳
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sufolon Max */}
                                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                                    ফরম ১ বনাম ৫
                                                </span>
                                                <label
                                                    htmlFor="sufolon_agreement_max"
                                                    className="text-sm font-bold text-slate-800"
                                                >
                                                    সুফলন ঋণ চুক্তিপত্র সর্বোচ্চ সীমা (টাকা)
                                                </label>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-600">
                                                সুফলন ঋণের পরিমাণ এই সীমার মধ্যে হলে ফরম ১ (ঋণ চুক্তিপত্র), আর এই সীমা অতিক্রম করলে ফরম ৫ (অগ্রসর সুফলন প্রোফাইল) তৈরি হবে।
                                            </p>
                                        </div>
                                        <div className="shrink-0 sm:w-44">
                                            <div className="relative">
                                                <input
                                                    id="sufolon_agreement_max"
                                                    type="number"
                                                    step="1000"
                                                    min="0"
                                                    value={form.data.sufolon_agreement_max}
                                                    disabled={!canManage || form.processing}
                                                    onChange={(e) =>
                                                        form.setData('sufolon_agreement_max', Number(e.target.value))
                                                    }
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pr-8 text-sm font-bold text-slate-900 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                                />
                                                <span className="pointer-events-none absolute right-3 top-2 text-xs font-semibold text-slate-400">
                                                    ৳
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                ডিফল্ট: ৳{config.defaults.sufolon_agreement_max.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Guarantor Min Amount */}
                                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                                    ফরম ২
                                                </span>
                                                <label
                                                    htmlFor="guarantor_min_amount"
                                                    className="text-sm font-bold text-slate-800"
                                                >
                                                    জামিনদার অঙ্গীকার (ফরম ২) ন্যূনতম ঋণ সীমা (টাকা)
                                                </label>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-600">
                                                ঋণের পরিমাণ এই টাকা বা তার বেশি হলে বিতরণের পূর্বে জামিনদার অঙ্গীকার (ফরম ২) পূরণ বাধ্যতামূলক হবে। এর নিচে থাকলে স্কিপ হবে।
                                            </p>
                                        </div>
                                        <div className="shrink-0 sm:w-44">
                                            <div className="relative">
                                                <input
                                                    id="guarantor_min_amount"
                                                    type="number"
                                                    step="1000"
                                                    min="0"
                                                    value={form.data.guarantor_min_amount}
                                                    disabled={!canManage || form.processing}
                                                    onChange={(e) =>
                                                        form.setData('guarantor_min_amount', Number(e.target.value))
                                                    }
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pr-8 text-sm font-bold text-slate-900 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                                />
                                                <span className="pointer-events-none absolute right-3 top-2 text-xs font-semibold text-slate-400">
                                                    ৳
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                ডিফল্ট: ৳{config.defaults.guarantor_min_amount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Investigation Form 4 Ceiling */}
                                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                                    ফরম ৪
                                                </span>
                                                <label
                                                    htmlFor="bm_investigation_ceiling"
                                                    className="text-sm font-bold text-slate-800"
                                                >
                                                    সরেজমিন তদন্ত প্রতিবেদন (ফরম ৪) প্রযোজ্য সীমা (টাকা)
                                                </label>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-600">
                                                ব্রাঞ্চ ম্যানেজার অনুমোদনের পূর্বে সরেজমিন তদন্ত প্রতিবেদন (ফরম ৪) বাধ্যতামূলক হওয়ার ঊর্ধ্বসীমা।
                                            </p>
                                        </div>
                                        <div className="shrink-0 sm:w-44">
                                            <div className="relative">
                                                <input
                                                    id="bm_investigation_ceiling"
                                                    type="number"
                                                    step="1000"
                                                    min="0"
                                                    value={form.data.bm_investigation_ceiling}
                                                    disabled={!canManage || form.processing}
                                                    onChange={(e) =>
                                                        form.setData('bm_investigation_ceiling', Number(e.target.value))
                                                    }
                                                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pr-8 text-sm font-bold text-slate-900 shadow-2xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                                />
                                                <span className="pointer-events-none absolute right-3 top-2 text-xs font-semibold text-slate-400">
                                                    ৳
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                ডিফল্ট: ৳{config.defaults.bm_investigation_ceiling.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </ConfigurationCard>

                            {/* Submit Button */}
                            {canManage && (
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={form.processing}
                                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <Save className="size-4" />
                                        {form.processing ? 'সংরক্ষণ করা হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Live Summary / Rules Guide */}
                        <div className="space-y-6">
                            <ConfigurationCard>
                                <div className="border-b border-slate-100 p-5">
                                    <div className="flex items-center gap-2">
                                        <Info className="size-4 text-blue-600" />
                                        <h3 className="text-sm font-bold text-slate-900">
                                            সক্রিয় কনফিগারেশন সারাংশ
                                        </h3>
                                    </div>
                                </div>
                                <div className="space-y-2.5 p-5 text-xs text-slate-600">
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
                                        <span className="font-medium text-slate-700">BM সরাসরি অনুমোদন:</span>
                                        <span className="font-bold text-blue-700">
                                            &lt; ৳{form.data.bm_approval_ceiling.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
                                        <span className="font-medium text-slate-700">টিম-ভিত্তিক শিট ফরওয়ার্ড:</span>
                                        <span className="font-bold text-amber-700">
                                            &ge; ৳{form.data.bm_approval_ceiling.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-purple-50/80 p-2.5">
                                        <span className="font-medium text-purple-900">৪ পৃষ্ঠার ফরম (ফরম ৫):</span>
                                        <span className="font-bold text-purple-700">
                                            মাসিক ঋণ ও সুফলন &gt; ৳{form.data.sufolon_agreement_max.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
                                        <span className="font-medium text-slate-700">সুফলন চুক্তিপত্র (ফরম ১):</span>
                                        <span className="font-bold text-emerald-700">
                                            &le; ৳{form.data.sufolon_agreement_max.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
                                        <span className="font-medium text-slate-700">জামিনদার অঙ্গীকার (ফরম ২):</span>
                                        <span className="font-bold text-slate-900">
                                            &ge; ৳{form.data.guarantor_min_amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
                                        <span className="font-medium text-slate-700">সরেজমিন তদন্ত (ফরম ৪):</span>
                                        <span className="font-bold text-slate-800">
                                            &lt; ৳{form.data.bm_investigation_ceiling.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </ConfigurationCard>

                            <ConfigurationCard>
                                <div className="space-y-3.5 p-5 text-xs leading-relaxed text-slate-600">
                                    <div className="flex items-start gap-2.5">
                                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                        <p>
                                            <strong className="text-slate-800">বর্তমান নিয়ম অক্ষুণ্ণ:</strong> আপনি কোনো মান পরিবর্তন না করলে সিস্টেমে বর্তমানে যেভাবে ঋণ অনুমোদন ও ফরম সিলেকশন চলছে হুবহু সেভাবেই চলবে।
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <FileCheck className="size-4 shrink-0 text-purple-600" />
                                        <p>
                                            <strong className="text-slate-800">৪ পৃষ্ঠার ফরম ইন্টিগ্রেশন:</strong> জাগরণ, বুনিয়াদ বা অগ্রসর ক্যাটাগরির মাসিক ঋণ তৈরি করলেই এই ৪ পৃষ্ঠার অনুমোদনপত্র পাওয়া যায়।
                                        </p>
                                    </div>
                                </div>
                            </ConfigurationCard>
                        </div>
                    </div>
                </form>

                {/* Reset Confirmation Modal */}
                {showResetConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex items-center gap-3 text-amber-600">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50">
                                    <AlertTriangle className="size-5" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900">
                                    ডিফল্ট সেটিংস রিস্টোর করবেন?
                                </h3>
                            </div>
                            <p className="mt-3 text-sm text-slate-600">
                                আপনি কি নিশ্চিত যে সমস্ত অনুমোদন সীমা এবং ফরম রুলস সিস্টেমের মূল ডিফল্ট মানে ফিরিয়ে আনতে চান? (BM সিলিং: ৭০,০০০ টাকা, সুফলন সীমা: ৯৯,০০০ টাকা, জামিনদার সীমা: ২০,০০০ টাকা, ৪ পৃষ্ঠার ফরম: মাসিক ভিত্তিতে)।
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    disabled={isResetting}
                                    onClick={() => setShowResetConfirm(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    বাতিল
                                </button>
                                <button
                                    type="button"
                                    disabled={isResetting}
                                    onClick={handleReset}
                                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
                                >
                                    <RotateCcw className="size-4" />
                                    {isResetting ? 'রিসেট হচ্ছে...' : 'হ্যাঁ, ডিফল্ট করুন'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </ConfigurationPage>
        </AdminLayout>
    );
}
