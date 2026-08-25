import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { AlertCircle, CheckCircle2, Users } from 'lucide-react';

type Officer = {
    id: number;
    name: string;
    pin?: string | null;
    role?: string | null;
};

type Cluster = {
    key: string;
    samity_id: number | null;
    samity_name: string;
    member_count: number;
    member_ids: number[];
};

type Group = {
    from_officer: { id: number; name: string; pin?: string | null };
    clusters: Cluster[];
};

interface Props {
    groups: Group[];
    officers: Officer[];
    pending_count: number;
}

function officerLabel(officer: Officer): string {
    return `${officer.name}${officer.pin ? ` (${officer.pin})` : ''}`;
}

export default function ClusterHandoverIndex({ groups, officers, pending_count }: Props) {
    const { flash, errors } = usePage().props as {
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    };

    const [picks, setPicks] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const readyClusters = useMemo(() => {
        const ready: Array<{ from_officer_id: number; samity_id: number | null; officer_id: number }> = [];
        groups.forEach((group) => {
            group.clusters.forEach((cluster) => {
                const officerId = picks[cluster.key];
                if (!officerId) {
                    return;
                }
                ready.push({
                    from_officer_id: group.from_officer.id,
                    samity_id: cluster.samity_id,
                    officer_id: Number(officerId),
                });
            });
        });
        return ready;
    }, [groups, picks]);

    const totalClusters = groups.reduce((sum, group) => sum + group.clusters.length, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (readyClusters.length === 0 || processing) {
            return;
        }

        setProcessing(true);
        router.post(
            '/cluster-handover',
            { assignments: readyClusters },
            { onFinish: () => setProcessing(false) },
        );
    };

    return (
        <AdminLayout>
            <Head title="ক্লাস্টার হস্তান্তর" />

            <div className="space-y-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold text-slate-900">ক্লাস্টার হস্তান্তর</h1>
                    <p className="text-sm text-slate-600">
                        ট্রান্সফার হওয়া অফিসারের সমিতি/ক্লাস্টার এই শাখার অন্য অফিসারকে দিন। দিয়ে গেলে তালিকা খালি হয়ে যাবে।
                    </p>
                </div>

                {flash?.success && (
                    <div className="rounded-lg bg-emerald-50 text-emerald-800 text-sm px-3 py-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        {flash.success}
                    </div>
                )}
                {(flash?.error || errors?.assignments) && (
                    <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {flash?.error || errors?.assignments}
                    </div>
                )}

                {groups.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="font-semibold text-slate-800">হস্তান্তরের কোনো ক্লাস্টার নেই</p>
                        <p className="text-sm text-slate-500 mt-1">ট্রান্সফার হলে এখানে সমিতিগুলো দেখাবে। দিয়ে গেলে শেষ।</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-slate-600">
                            বাকি সদস্য <span className="font-semibold text-slate-900">{pending_count}</span> জন · ক্লাস্টার{' '}
                            <span className="font-semibold text-slate-900">{totalClusters}</span>
                        </p>

                        {groups.map((group) => (
                            <section key={group.from_officer.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">ট্রান্সফার হওয়া অফিসার</p>
                                    <p className="font-bold text-slate-900">
                                        {group.from_officer.name}
                                        {group.from_officer.pin ? ` (${group.from_officer.pin})` : ''}
                                    </p>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {group.clusters.map((cluster) => (
                                        <div key={cluster.key} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-900">{cluster.samity_name}</p>
                                                <p className="text-xs text-slate-500">{cluster.member_count} জন সদস্য</p>
                                            </div>
                                            <select
                                                value={picks[cluster.key] || ''}
                                                onChange={(e) =>
                                                    setPicks((prev) => ({
                                                        ...prev,
                                                        [cluster.key]: e.target.value,
                                                    }))
                                                }
                                                className="sm:w-72 rounded-md border border-slate-300 px-3 py-2 text-sm"
                                            >
                                                <option value="">কাকে দিবেন?</option>
                                                {officers
                                                    .filter((o) => o.id !== group.from_officer.id)
                                                    .map((o) => (
                                                        <option key={o.id} value={o.id}>
                                                            {officerLabel(o)}
                                                            {o.role ? ` — ${o.role}` : ''}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={readyClusters.length === 0 || processing}
                                className="rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-medium px-5 py-2.5 text-sm"
                            >
                                {processing
                                    ? 'হচ্ছে...'
                                    : readyClusters.length === totalClusters
                                      ? 'সব ক্লাস্টার হস্তান্তর করুন'
                                      : `${readyClusters.length}টি ক্লাস্টার দিন`}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
