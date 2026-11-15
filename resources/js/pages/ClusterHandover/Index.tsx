import { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { ComboSelect } from '@/components/ComboSelect';
import { formatBranchLabel } from '@/utils/branchLabel';
import { AlertCircle, ArrowRightLeft, CheckCircle2, Search, Users } from 'lucide-react';

type Officer = {
    id: number;
    name: string;
    pin?: string | null;
    role?: string | null;
};

type BranchOption = {
    id: number;
    name: string;
    code?: string | null;
};

type SamityOption = {
    id: number;
    branch_id: number;
    name: string;
    code?: string | null;
    branch_name?: string | null;
    member_count: number;
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

type SearchResult = {
    id: number;
    application_no?: string | null;
    name: string;
    mobile?: string | null;
    samity_id: number | null;
    samity_name: string;
    samity_member_count: number;
    branch_name?: string | null;
    officer: { id: number | null; name: string; pin?: string | null };
};

interface Props {
    groups: Group[];
    officers: Officer[];
    target_officers: Officer[];
    pending_count: number;
    branches: BranchOption[];
    samities: SamityOption[];
    branch_id: number | null;
    samity_id: number | null;
    search: string;
    search_mode: 'single' | 'samity';
    search_results: SearchResult[];
}

function officerLabel(officer: { name: string; pin?: string | null; role?: string | null }): string {
    const pin = officer.pin ? ` (${officer.pin})` : '';
    const role = officer.role ? ` — ${officer.role}` : '';

    return `${officer.name}${pin}${role}`;
}

function samityLabel(samity: SamityOption): string {
    const name = samity.code ? `${samity.code} — ${samity.name}` : samity.name;

    return `${name} · ${samity.member_count} জন`;
}

export default function ClusterHandoverIndex({
    groups,
    officers,
    target_officers,
    pending_count,
    branches,
    samities,
    branch_id,
    samity_id,
    search,
    search_mode,
    search_results,
}: Props) {
    const { flash, errors } = usePage().props as {
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    };

    const [picks, setPicks] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [query, setQuery] = useState(search || '');
    const [mode, setMode] = useState<'single' | 'samity'>(search_mode || 'single');
    const [pickedMember, setPickedMember] = useState<number | null>(null);
    const [targetOfficerId, setTargetOfficerId] = useState<number | null>(null);
    const [reassigning, setReassigning] = useState(false);

    useEffect(() => {
        setQuery(search || '');
        setMode(search_mode || 'single');
    }, [search, search_mode]);

    useEffect(() => {
        setPickedMember(null);
        setTargetOfficerId(null);
    }, [branch_id, samity_id]);

    const branchItems = useMemo(
        () => branches.map((branch) => ({ value: branch.id, label: formatBranchLabel(branch), keywords: `${branch.name} ${branch.code ?? ''}` })),
        [branches],
    );
    const visibleSamities = useMemo(
        () => samities.filter((samity) => !branch_id || samity.branch_id === branch_id),
        [samities, branch_id],
    );
    const samityItems = useMemo(
        () =>
            visibleSamities.map((samity) => ({
                value: samity.id,
                label: samityLabel(samity),
                keywords: `${samity.name} ${samity.code ?? ''} ${samity.branch_name ?? ''}`,
            })),
        [visibleSamities],
    );
    const officerItems = useMemo(
        () => target_officers.map((officer) => ({ value: officer.id, label: officerLabel(officer), keywords: `${officer.name} ${officer.pin ?? ''} ${officer.role ?? ''}` })),
        [target_officers],
    );

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
    const selectedSamity = visibleSamities.find((samity) => samity.id === samity_id) ?? null;
    const selectedMember = search_results.find((row) => row.id === pickedMember) ?? null;
    const sameOfficer = mode === 'single' && selectedMember?.officer.id !== null && selectedMember?.officer.id === targetOfficerId;
    const wholeAlreadyThere =
        mode === 'samity' &&
        !query.trim() &&
        !!selectedSamity &&
        selectedSamity.member_count > 0 &&
        search_results.length === selectedSamity.member_count &&
        search_results.every((row) => row.officer.id === targetOfficerId);

    const visit = (patch: { branch_id?: number | null; samity_id?: number | null; search?: string; mode?: 'single' | 'samity' }) => {
        router.get(
            '/cluster-handover',
            {
                branch_id: patch.branch_id === undefined ? branch_id : patch.branch_id,
                samity_id: patch.samity_id === undefined ? samity_id : patch.samity_id,
                search: patch.search === undefined ? query.trim() : patch.search,
                mode: patch.mode ?? mode,
            },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (readyClusters.length === 0 || processing) {
            return;
        }

        setProcessing(true);
        router.post('/cluster-handover', { assignments: readyClusters }, { onFinish: () => setProcessing(false) });
    };

    const handleMemberSearch = (e: React.FormEvent) => {
        e.preventDefault();
        visit({ search: query.trim() });
    };

    const handleReassign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetOfficerId || reassigning || sameOfficer || wholeAlreadyThere) {
            return;
        }
        if (mode === 'single' && !pickedMember) {
            return;
        }
        if (mode === 'samity' && !samity_id) {
            return;
        }

        setReassigning(true);
        router.post(
            '/cluster-handover/reassign',
            {
                mode,
                member_id: mode === 'single' ? pickedMember : null,
                samity_id,
                officer_id: targetOfficerId,
                branch_id,
                search: query.trim(),
            },
            { preserveScroll: true, onFinish: () => setReassigning(false) },
        );
    };

    const errorMessage = flash?.error || errors?.assignments || errors?.member_id || errors?.officer_id || errors?.samity_id || errors?.mode;

    return (
        <AdminLayout>
            <Head title="ক্লাস্টার হস্তান্তর" />

            <div className="mx-auto max-w-5xl space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">শাখা ক্লাস্টার</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">ক্লাস্টার হস্তান্তর</h1>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                            এই শাখার সমিতি বেছে নিন। একজন সদস্য বা পুরো সমিতি নতুন অফিসারের কাছে দিন। সমিতি একই থাকে।
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                            <p className="text-[11px] font-medium text-slate-500">বাকি হস্তান্তর</p>
                            <p className="text-lg font-bold text-slate-900">{pending_count}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                            <p className="text-[11px] font-medium text-slate-500">সমিতি</p>
                            <p className="text-lg font-bold text-slate-900">{visibleSamities.length}</p>
                        </div>
                    </div>
                </div>

                {flash?.success && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {flash.success}
                    </div>
                )}
                {errorMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {errorMessage}
                    </div>
                )}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <ArrowRightLeft className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900">বিদ্যমান ক্লাস্টার পরিবর্তন</h2>
                            <p className="mt-0.5 text-sm text-slate-500">শাখার সমিতি খুঁজে বেছে নিন, তারপর কাকে দিবেন সেটা ঠিক করুন।</p>
                        </div>
                    </div>

                    <div className={`grid gap-4 px-5 py-4 ${branches.length > 1 ? 'md:grid-cols-2' : ''}`}>
                        {branches.length > 1 && (
                            <div className="min-w-0">
                                <p className="mb-1.5 text-xs font-semibold text-slate-500">শাখা</p>
                                <ComboSelect
                                    value={branch_id}
                                    onChange={(value) => visit({ branch_id: value, samity_id: null, search: '' })}
                                    items={branchItems}
                                    placeholder="শাখা বেছে নিন"
                                    clearable={false}
                                />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="mb-1.5 text-xs font-semibold text-slate-500">সমিতি</p>
                            <ComboSelect
                                value={samity_id}
                                onChange={(value) => visit({ samity_id: value, search: '' })}
                                items={samityItems}
                                placeholder={branch_id ? 'সমিতির নাম বা কোড লিখুন' : 'আগে শাখা বেছে নিন'}
                                disabled={!branch_id}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="inline-flex rounded-xl bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => setMode('single')}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                একক সদস্য
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('samity')}
                                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === 'samity' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                পুরো সমিতি
                            </button>
                        </div>
                        {selectedSamity && (
                            <p className="text-sm text-slate-600">
                                <span className="font-semibold text-slate-900">{selectedSamity.name}</span>
                                <span className="text-slate-400"> · </span>
                                {selectedSamity.member_count} জন সদস্য
                            </p>
                        )}
                    </div>

                    {!selectedSamity ? (
                        <div className="mx-5 mb-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                            <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                            <p className="font-medium text-slate-700">সমিতি বেছে নিন</p>
                            <p className="mt-1 text-sm text-slate-500">কম্বোতে নাম বা কোড লিখে এই শাখার সমিতি খুলুন।</p>
                        </div>
                    ) : (
                        <form onSubmit={handleReassign}>
                            {mode === 'single' && (
                                <div className="border-t border-slate-100 px-5 py-3">
                                    <div className="flex gap-2">
                                        <div className="relative min-w-0 flex-1">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        visit({ search: query.trim() });
                                                    }
                                                }}
                                                placeholder="এই সমিতিতে সদস্য কোড, নাম বা মোবাইল"
                                                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleMemberSearch}
                                            className="rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                                        >
                                            খুঁজুন
                                        </button>
                                    </div>
                                </div>
                            )}

                            {search_results.length === 0 ? (
                                <p className="px-5 py-8 text-center text-sm text-slate-500">এই সমিতিতে কোনো সদস্য পাওয়া যায়নি।</p>
                            ) : (
                                <div className="overflow-x-auto border-t border-slate-100">
                                    <table className="w-full min-w-[640px] text-left text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                {mode === 'single' && <th className="w-10 px-4 py-2.5" />}
                                                <th className="px-4 py-2.5">সদস্য</th>
                                                <th className="px-4 py-2.5">মোবাইল</th>
                                                <th className="px-4 py-2.5">বর্তমান অফিসার</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {search_results.map((row) => {
                                                const active = pickedMember === row.id;

                                                return (
                                                    <tr
                                                        key={row.id}
                                                        onClick={() => mode === 'single' && setPickedMember(row.id)}
                                                        className={mode === 'single' ? `cursor-pointer ${active ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}` : ''}
                                                    >
                                                        {mode === 'single' && (
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    type="radio"
                                                                    name="member_id"
                                                                    checked={active}
                                                                    onChange={() => setPickedMember(row.id)}
                                                                    className="text-emerald-600 focus:ring-emerald-500"
                                                                />
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3">
                                                            <p className="font-semibold text-slate-900">{row.name}</p>
                                                            <p className="font-mono text-xs text-blue-700">{row.application_no || '—'}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600">{row.mobile || '—'}</td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-slate-800">{row.officer.name}</p>
                                                            {row.officer.pin && <p className="text-xs text-slate-500">{row.officer.pin}</p>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1">
                                    <p className="mb-1.5 text-xs font-semibold text-slate-500">নতুন অফিসার</p>
                                    <ComboSelect
                                        value={targetOfficerId}
                                        onChange={setTargetOfficerId}
                                        items={officerItems}
                                        placeholder="কাকে দিবেন?"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={
                                        !targetOfficerId ||
                                        reassigning ||
                                        sameOfficer ||
                                        wholeAlreadyThere ||
                                        (mode === 'single' ? !pickedMember : selectedSamity.member_count === 0)
                                    }
                                    className="h-12 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
                                >
                                    {reassigning
                                        ? 'হচ্ছে...'
                                        : mode === 'samity'
                                          ? `পুরো সমিতি দিন (${selectedSamity.member_count} জন)`
                                          : 'এই সদস্যের ক্লাস্টার বদলান'}
                                </button>
                            </div>
                        </form>
                    )}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-bold text-slate-900">ট্রান্সফার হওয়া অফিসার</h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            যারা শাখায় আর নেই, তাদের বাকি সমিতি এখান থেকে দিন। {totalClusters > 0 ? `${totalClusters}টি ক্লাস্টার বাকি।` : 'এখন কিছু বাকি নেই।'}
                        </p>
                    </div>

                    {groups.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-slate-500">হস্তান্তরের কোনো খালি ক্লাস্টার নেই।</p>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="divide-y divide-slate-100">
                                {groups.map((group) => (
                                    <div key={group.from_officer.id}>
                                        <div className="bg-amber-50/80 px-5 py-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">আগের অফিসার</p>
                                            <p className="font-bold text-slate-900">
                                                {group.from_officer.name}
                                                {group.from_officer.pin ? ` (${group.from_officer.pin})` : ''}
                                            </p>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {group.clusters.map((cluster) => (
                                                <div key={cluster.key} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-slate-900">{cluster.samity_name}</p>
                                                        <p className="text-xs text-slate-500">{cluster.member_count} জন সদস্য</p>
                                                    </div>
                                                    <div className="sm:w-80">
                                                        <ComboSelect
                                                            size="sm"
                                                            value={picks[cluster.key] ? Number(picks[cluster.key]) : null}
                                                            onChange={(value) =>
                                                                setPicks((prev) => ({
                                                                    ...prev,
                                                                    [cluster.key]: value ? String(value) : '',
                                                                }))
                                                            }
                                                            items={officers
                                                                .filter((officer) => officer.id !== group.from_officer.id)
                                                                .map((officer) => ({
                                                                    value: officer.id,
                                                                    label: officerLabel(officer),
                                                                    keywords: `${officer.name} ${officer.pin ?? ''}`,
                                                                }))}
                                                            placeholder="কাকে দিবেন?"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end border-t border-slate-100 px-5 py-4">
                                <button
                                    type="submit"
                                    disabled={readyClusters.length === 0 || processing}
                                    className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
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
                </section>
            </div>
        </AdminLayout>
    );
}
