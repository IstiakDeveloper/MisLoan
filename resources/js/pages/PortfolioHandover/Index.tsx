import React, { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertCircle, LogOut } from 'lucide-react';

type Officer = {
    id: number;
    name: string;
    pin?: string | null;
    role?: string | null;
};

type MemberRow = {
    id: number;
    application_no?: string | null;
    applicant_name_en?: string | null;
    applicant_name_bn?: string | null;
    mobile_number?: string | null;
    status?: string | null;
    branch_id: number;
    branch?: { id: number; name: string; code?: string | null } | null;
    samity?: { id: number; name: string; code?: string | null } | null;
};

interface Props {
    currentBranch?: { id: number; name: string; code?: string | null } | null;
    members: MemberRow[];
    officersByBranch: Record<string, Officer[]>;
}

function memberName(member: MemberRow): string {
    return member.applicant_name_bn || member.applicant_name_en || member.application_no || `#${member.id}`;
}

function officerLabel(officer: Officer): string {
    return `${officer.name}${officer.pin ? ` (${officer.pin})` : ''}`;
}

export default function PortfolioHandoverIndex({ currentBranch, members, officersByBranch }: Props) {
    const { flash, errors } = usePage().props as {
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    };

    const [assignments, setAssignments] = useState<Record<number, string>>({});
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkOfficerId, setBulkOfficerId] = useState('');
    const [processing, setProcessing] = useState(false);

    const officers = useMemo(() => {
        const map = new Map<number, Officer>();
        Object.values(officersByBranch).forEach((list) => {
            list.forEach((o) => map.set(o.id, o));
        });
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [officersByBranch]);

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const allSelected = members.length > 0 && selectedIds.length === members.length;
    const readyCount = members.filter((m) => Boolean(assignments[m.id])).length;

    const toggleOne = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleAll = () => {
        setSelectedIds(allSelected ? [] : members.map((m) => m.id));
    };

    const applyToSelected = () => {
        if (!bulkOfficerId || selectedIds.length === 0) return;

        const officerId = Number(bulkOfficerId);
        const invalid = selectedIds.some((id) => {
            const member = members.find((m) => m.id === id);
            if (!member) return true;
            const list = officersByBranch[String(member.branch_id)] || [];
            return !list.some((o) => o.id === officerId);
        });

        if (invalid) {
            alert('নির্বাচিত সদস্যের শাখায় এই অফিসার নেই।');
            return;
        }

        setAssignments((prev) => {
            const next = { ...prev };
            selectedIds.forEach((id) => {
                next[id] = bulkOfficerId;
            });
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const ready = members.filter((m) => Boolean(assignments[m.id]));
        if (ready.length === 0 || processing) return;

        setProcessing(true);
        router.post(
            '/portfolio-handover',
            {
                assignments: ready.map((m) => ({
                    member_id: m.id,
                    officer_id: Number(assignments[m.id]),
                })),
            },
            { onFinish: () => setProcessing(false) },
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-start justify-center p-4 py-8">
            <Head title="সদস্য হস্তান্তর" />

            <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-amber-600 text-white px-5 py-4 flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                        <div>
                            <h1 className="text-lg font-semibold">সদস্য হস্তান্তর করুন</h1>
                            <p className="text-sm text-amber-50 mt-1">
                                ট্রান্সফার হয়েছে
                                {currentBranch ? ` · বর্তমান শাখা: ${currentBranch.name}` : ''}। সব সদস্য
                                হস্তান্তর না করা পর্যন্ত অন্য কাজ করা যাবে না।
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.post('/logout')}
                        className="inline-flex items-center gap-1.5 rounded-md bg-white/15 hover:bg-white/25 px-3 py-1.5 text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        লগআউট
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {flash?.success && (
                        <div className="rounded-md bg-emerald-50 text-emerald-800 text-sm px-3 py-2">
                            {flash.success}
                        </div>
                    )}
                    {(flash?.error || errors?.assignments) && (
                        <div className="rounded-md bg-red-50 text-red-700 text-sm px-3 py-2">
                            {flash?.error || errors?.assignments}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 justify-between">
                        <p className="text-sm text-slate-600">
                            মোট <span className="font-semibold text-slate-900">{members.length}</span> জন · সিলেক্টেড{' '}
                            <span className="font-semibold text-slate-900">{selectedIds.length}</span>
                        </p>
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
                        >
                            {allSelected ? 'সব আনসিলেক্ট' : 'একবারে সব সিলেক্ট'}
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={bulkOfficerId}
                            onChange={(e) => setBulkOfficerId(e.target.value)}
                            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                            <option value="">অফিসার বাছুন</option>
                            {officers.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {officerLabel(o)}
                                    {o.role ? ` — ${o.role}` : ''}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={applyToSelected}
                            disabled={!bulkOfficerId || selectedIds.length === 0}
                            className="rounded-md bg-slate-800 text-white text-sm font-medium px-4 py-2 disabled:opacity-40"
                        >
                            সিলেক্টেডদেরকে দিন
                        </button>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="max-h-[55vh] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                    <tr>
                                        <th className="w-10 px-3 py-2.5 text-left">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={toggleAll}
                                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                title="সব সিলেক্ট"
                                            />
                                        </th>
                                        <th className="text-left px-3 py-2.5 font-medium">সদস্য</th>
                                        <th className="text-left px-3 py-2.5 font-medium">সমিতি</th>
                                        <th className="text-left px-3 py-2.5 font-medium min-w-[180px]">অফিসার</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((member) => {
                                        const rowOfficers = officersByBranch[String(member.branch_id)] || [];
                                        return (
                                            <tr key={member.id} className="border-t border-slate-100">
                                                <td className="px-3 py-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSet.has(member.id)}
                                                        onChange={() => toggleOne(member.id)}
                                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                                                    />
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="font-medium text-slate-900">{memberName(member)}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {member.application_no || '—'}
                                                        {member.mobile_number ? ` · ${member.mobile_number}` : ''}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-slate-600">
                                                    {member.samity?.name || '—'}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <select
                                                        value={assignments[member.id] || ''}
                                                        onChange={(e) =>
                                                            setAssignments((prev) => ({
                                                                ...prev,
                                                                [member.id]: e.target.value,
                                                            }))
                                                        }
                                                        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                                                    >
                                                        <option value="">বাছুন</option>
                                                        {rowOfficers.map((o) => (
                                                            <option key={o.id} value={o.id}>
                                                                {officerLabel(o)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-slate-500">
                            অফিসার সেট: {readyCount}/{members.length}
                            {readyCount < members.length ? ' · বাকি পরেও হস্তান্তর করা যাবে' : ''}
                        </p>
                        <button
                            type="submit"
                            disabled={readyCount === 0 || processing}
                            className="rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-medium px-5 py-2.5 text-sm"
                        >
                            {processing
                                ? 'হচ্ছে...'
                                : readyCount === members.length
                                  ? 'সব হস্তান্তর সম্পন্ন করুন'
                                  : `${readyCount} জন হস্তান্তর করুন`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
