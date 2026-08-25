import { Head, useForm } from '@inertiajs/react';
import { Clock, Save, ShieldAlert } from 'lucide-react';

import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
} from '@/components/configuration';
import AdminLayout from '@/layouts/admin-layout';

interface Cutoff {
    time: string;
    label: string;
    badge: string;
    is_blocked: boolean;
}

interface Props {
    cutoff: Cutoff;
    canManage: boolean;
}

const PRESETS = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

function formatPreset(time: string): string {
    const [hourStr, minute] = time.split(':');
    const hour = Number(hourStr);
    const hour12 = hour % 12 || 12;
    const suffix = hour >= 12 ? 'PM' : 'AM';

    return `${hour12}:${minute} ${suffix}`;
}

export default function SendCutoff({ cutoff, canManage }: Props) {
    const form = useForm({
        cutoff_time: cutoff.time,
    });

    return (
        <AdminLayout>
            <Head title="প্রেরণ সময়সীমা" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="প্রেরণ সময়সীমা"
                    description="শাখা থেকে ঋণ আবেদন ও সদস্য ভর্তি হেড অফিসে পাঠানোর দৈনিক শেষ সময়। ডিফল্ট বিকাল ৫:০০টা।"
                    icon={Clock}
                />

                <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                    <ConfigurationCard>
                        <form
                            className="space-y-6 p-5 sm:p-7"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (!canManage) {
                                    return;
                                }
                                form.put('/head-office/send-cutoff', { preserveScroll: true });
                            }}
                        >
                            <div className="space-y-2">
                                <label
                                    htmlFor="cutoff_time"
                                    className="text-sm font-semibold text-slate-800"
                                >
                                    হেড অফিসে পাঠানোর শেষ সময়
                                </label>
                                <p className="text-sm leading-6 text-slate-600">
                                    এই সময়ের পর শাখা ব্যবহারকারীরা যাচাইয়ের জন্য ঋণ আবেদন বা সদস্য
                                    ভর্তি পাঠাতে পারবেন না। পরের দিন সকাল থেকে আবার খুলে যাবে।
                                </p>
                                <input
                                    id="cutoff_time"
                                    type="time"
                                    value={form.data.cutoff_time}
                                    disabled={!canManage || form.processing}
                                    onChange={(event) =>
                                        form.setData('cutoff_time', event.target.value)
                                    }
                                    className="h-12 w-full max-w-xs rounded-xl border border-slate-300 bg-white px-4 text-lg font-semibold text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                                {form.errors.cutoff_time && (
                                    <p className="text-sm font-medium text-rose-600">
                                        {form.errors.cutoff_time}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    দ্রুত নির্বাচন
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {PRESETS.map((time) => {
                                        const selected = form.data.cutoff_time === time;

                                        return (
                                            <button
                                                key={time}
                                                type="button"
                                                disabled={!canManage || form.processing}
                                                onClick={() => form.setData('cutoff_time', time)}
                                                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                                                    selected
                                                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                                                } disabled:cursor-not-allowed disabled:opacity-50`}
                                            >
                                                {formatPreset(time)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {canManage && (
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Save className="size-4" />
                                    {form.processing ? 'সংরক্ষণ হচ্ছে...' : 'সময়সীমা সংরক্ষণ করুন'}
                                </button>
                            )}
                        </form>
                    </ConfigurationCard>

                    <ConfigurationCard>
                        <div className="space-y-4 p-5 sm:p-7">
                            <div className="flex items-start gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                                    <ShieldAlert className="size-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">
                                        বর্তমান সময়সীমা
                                    </p>
                                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                                        {cutoff.label}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">{cutoff.badge}</p>
                                </div>
                            </div>
                            <div
                                className={`rounded-xl border px-4 py-3 text-sm ${
                                    cutoff.is_blocked
                                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                }`}
                            >
                                {cutoff.is_blocked
                                    ? 'এখন শাখা থেকে হেড অফিসে পাঠানো বন্ধ আছে।'
                                    : 'এখন শাখা থেকে হেড অফিসে পাঠানো চালু আছে।'}
                            </div>
                            <p className="text-sm leading-6 text-slate-600">
                                সময় বাংলাদেশ সময় (ঢাকা) অনুযায়ী গণনা হয়। পরিবর্তন সব শাখায় সাথে
                                সাথে কার্যকর হবে।
                            </p>
                        </div>
                    </ConfigurationCard>
                </div>
            </ConfigurationPage>
        </AdminLayout>
    );
}
