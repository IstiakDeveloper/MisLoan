import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    CalendarPlus,
    Lock,
    RotateCcw,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';

interface FinancialYear {
    id: number;
    name: string;
    starts_on: string;
    ends_on: string;
    closed_at: string | null;
    branch_financial_years_count: number;
    opened_by_user?: { id: number; name: string } | null;
}

interface Holiday {
    id: number;
    holiday_date: string;
    title: string;
    kind: string;
    branch?: { id: number; name: string; code: string } | null;
}

interface Branch {
    id: number;
    name: string;
    code: string;
    area_id: number;
}

interface Zone {
    id: number;
    name: string;
}

interface Area {
    id: number;
    name: string;
    zone_id: number;
}

interface BranchMonitorRow {
    branch_id: number;
    branch_name: string;
    branch_code: string;
    area_name: string | null;
    zone_name: string | null;
    initial_date: string | null;
    financial_year: string | null;
    open_day: string | null;
    last_closed_day: string | null;
    last_month_date: string | null;
    last_month_status: string | null;
}

interface ReopenLog {
    id: number;
    kind: string;
    period_date: string;
    reason: string;
    reopened_at: string;
    branch?: { id: number; name: string; code: string } | null;
    reopened_by_user?: { id: number; name: string } | null;
}

interface Props {
    financialYears: FinancialYear[];
    currentFySuggestion: { start_year: number; name: string; starts_on: string; ends_on: string };
    holidays: Holiday[];
    branches: Branch[];
    zones: Zone[];
    areas: Area[];
    branchMonitor: BranchMonitorRow[];
    reopenLogs: ReopenLog[];
    filters: { zone_id: number | null; area_id: number | null };
    canManage: boolean;
}

export default function AccountingPeriods({
    financialYears,
    currentFySuggestion,
    holidays,
    branches,
    zones,
    areas,
    branchMonitor,
    reopenLogs,
    filters,
    canManage,
}: Props) {
    const [tab, setTab] = useState<'monitor' | 'initial' | 'fy' | 'holidays'>('monitor');

    const fyForm = useForm<{ start_year: number; period?: string }>({
        start_year: currentFySuggestion.start_year,
    });

    const initialForm = useForm<{ financial_year_id: string | number; branch_id: string | number; initial_date: string; period?: string }>({
        financial_year_id: financialYears.find((f) => !f.closed_at)?.id ?? '',
        branch_id: branches[0]?.id ?? '',
        initial_date: new Date().toISOString().slice(0, 10),
    });

    const holidayForm = useForm({
        holiday_date: new Date().toISOString().slice(0, 10),
        title: '',
        kind: 'govt',
        branch_id: '',
    });

    const reopenForm = useForm<{ branch_id: string; kind: string; period_date: string; reason: string; period?: string }>({
        branch_id: '',
        kind: 'day',
        period_date: '',
        reason: '',
    });

    const applyFilter = (zoneId: string, areaId: string) => {
        router.get(
            '/head-office/accounting-periods',
            { zone_id: zoneId || undefined, area_id: areaId || undefined },
            { preserveState: true },
        );
    };

    return (
        <AdminLayout>
            <Head title="Accounting Period Control (Head Office)" />

            <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            Head Office — Accounting Period & Day Initial Control
                        </h1>
                        <p className="mt-1 text-xs text-slate-500">
                            অর্থবছর, সরকারি ছুটি, শাখার Manage Day Initial এবং সব শাখার Day Open/Close মনিটরিং।
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'monitor', label: 'Branch Monitor & Reopen', icon: Building2 },
                        { id: 'initial', label: 'Manage Day Initial', icon: CalendarPlus },
                        { id: 'fy', label: 'Financial Years', icon: Calendar },
                        { id: 'holidays', label: 'Holidays & Reopen Logs', icon: RotateCcw },
                    ].map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id as typeof tab)}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                                    active
                                        ? 'border-brand bg-brand text-white shadow-xs'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {tab === 'monitor' && (
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-sm font-bold text-slate-900">সকল শাখার Day / Month স্ট্যাটাস</h2>
                                <div className="flex gap-2">
                                    <select
                                        value={filters.zone_id ?? ''}
                                        onChange={(e) => applyFilter(e.target.value, '')}
                                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                    >
                                        <option value="">All Zones</option>
                                        {zones.map((z) => (
                                            <option key={z.id} value={z.id}>
                                                {z.name}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={filters.area_id ?? ''}
                                        onChange={(e) => applyFilter(String(filters.zone_id ?? ''), e.target.value)}
                                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                    >
                                        <option value="">All Areas</option>
                                        {areas
                                            .filter((a) => !filters.zone_id || a.zone_id === filters.zone_id)
                                            .map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">শাখা</th>
                                            <th className="py-2">Zone / Area</th>
                                            <th className="py-2">Initial Date</th>
                                            <th className="py-2">Open Day</th>
                                            <th className="py-2">Last Closed Day</th>
                                            <th className="py-2">Last Month</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchMonitor.map((row) => (
                                            <tr key={row.branch_id} className="border-b border-slate-50">
                                                <td className="py-2.5 font-semibold text-slate-800">
                                                    {row.branch_name} ({row.branch_code})
                                                </td>
                                                <td className="py-2.5 text-slate-500">
                                                    {row.zone_name ?? '-'} / {row.area_name ?? '-'}
                                                </td>
                                                <td className="py-2.5 text-slate-700">{row.initial_date ?? 'Not Set'}</td>
                                                <td className="py-2.5">
                                                    {row.open_day ? (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                            {row.open_day} (Open)
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">None</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 text-slate-600">{row.last_closed_day ?? '-'}</td>
                                                <td className="py-2.5 text-slate-600">
                                                    {row.last_month_date
                                                        ? `${row.last_month_date} (${row.last_month_status})`
                                                        : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {canManage && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    reopenForm.post('/head-office/accounting-periods/reopen', {
                                        onSuccess: () => reopenForm.reset('reason'),
                                    });
                                }}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                            >
                                <h3 className="text-sm font-bold text-slate-900">
                                    Reopen Closed Day / Month (Head Office Override)
                                </h3>
                                <div className="mt-3 grid gap-3 md:grid-cols-4">
                                    <select
                                        value={reopenForm.data.branch_id}
                                        onChange={(e) => reopenForm.setData('branch_id', e.target.value)}
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    >
                                        <option value="">শাখা নির্বাচন করুন</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name} ({b.code})
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={reopenForm.data.kind}
                                        onChange={(e) => reopenForm.setData('kind', e.target.value)}
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        <option value="day">Day</option>
                                        <option value="month">Month (Month-End Date)</option>
                                    </select>
                                    <input
                                        type="date"
                                        value={reopenForm.data.period_date}
                                        onChange={(e) => reopenForm.setData('period_date', e.target.value)}
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                    <input
                                        type="text"
                                        value={reopenForm.data.reason}
                                        onChange={(e) => reopenForm.setData('reason', e.target.value)}
                                        placeholder="Reopen করার কারণ লিখুন"
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                </div>
                                {reopenForm.errors.period && (
                                    <p className="mt-2 text-xs font-medium text-rose-600">{reopenForm.errors.period}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={reopenForm.processing}
                                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reopen Period
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {tab === 'initial' && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            initialForm.post('/head-office/accounting-periods/day-initial');
                        }}
                        className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                    >
                        <h2 className="text-sm font-bold text-slate-900">Manage Day Initial (শাখার শুরুর তারিখ সেট)</h2>
                        <p className="text-xs text-slate-500">
                            কোনো শাখা প্রথমবার সিস্টেমে কাজ শুরু করার আগে Head Office থেকে তার অর্থবছর ও শুরুর তারিখ (Initial Date) সেট করে দিতে হবে।
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Financial Year</label>
                            <select
                                value={initialForm.data.financial_year_id}
                                onChange={(e) => initialForm.setData('financial_year_id', e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                required
                            >
                                <option value="">অর্থবছর নির্বাচন করুন</option>
                                {financialYears
                                    .filter((f) => !f.closed_at)
                                    .map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.name} ({f.starts_on} → {f.ends_on})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Branch</label>
                            <select
                                value={initialForm.data.branch_id}
                                onChange={(e) => initialForm.setData('branch_id', e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                required
                            >
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700">Initial Business Date</label>
                            <input
                                type="date"
                                value={initialForm.data.initial_date}
                                onChange={(e) => initialForm.setData('initial_date', e.target.value)}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                required
                            />
                        </div>

                        {initialForm.errors.period && (
                            <p className="text-xs font-medium text-rose-600">{initialForm.errors.period}</p>
                        )}

                        <button
                            type="submit"
                            disabled={!canManage || initialForm.processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                        >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            Save Day Initial
                        </button>
                    </form>
                )}

                {tab === 'fy' && (
                    <div className="space-y-5">
                        {canManage && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    fyForm.post('/head-office/accounting-periods/financial-years');
                                }}
                                className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                            >
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">
                                        নতুন অর্থবছর শুরুর সাল (July 1 – June 30)
                                    </label>
                                    <input
                                        type="number"
                                        value={fyForm.data.start_year}
                                        onChange={(e) => fyForm.setData('start_year', Number(e.target.value))}
                                        className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                        min={2020}
                                        max={2099}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={fyForm.processing}
                                    className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-dark"
                                >
                                    Open Financial Year ({fyForm.data.start_year}-{fyForm.data.start_year + 1})
                                </button>
                                {fyForm.errors.period && (
                                    <p className="w-full text-xs font-medium text-rose-600">{fyForm.errors.period}</p>
                                )}
                            </form>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-500">
                                        <th className="py-2">অর্থবছর</th>
                                        <th className="py-2">সময়কাল</th>
                                        <th className="py-2">এনরোলকৃত শাখা</th>
                                        <th className="py-2">স্ট্যাটাস</th>
                                        <th className="py-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {financialYears.map((fy) => (
                                        <tr key={fy.id} className="border-b border-slate-50">
                                            <td className="py-2.5 font-bold text-slate-800">{fy.name}</td>
                                            <td className="py-2.5 text-slate-600">
                                                {fy.starts_on} → {fy.ends_on}
                                            </td>
                                            <td className="py-2.5 text-slate-600">{fy.branch_financial_years_count}</td>
                                            <td className="py-2.5">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                        fy.closed_at
                                                            ? 'bg-slate-100 text-slate-700'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                    }`}
                                                >
                                                    {fy.closed_at ? 'Closed' : 'Open'}
                                                </span>
                                            </td>
                                            <td className="py-2.5">
                                                {canManage && !fy.closed_at && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.post(`/head-office/accounting-periods/financial-years/${fy.id}/close`)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                                    >
                                                        <Lock className="h-3 w-3" />
                                                        Close Year
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'holidays' && (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                            <h2 className="text-sm font-bold text-slate-900">Holiday Calendar</h2>
                            {canManage && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        holidayForm.post('/head-office/accounting-periods/holidays', {
                                            onSuccess: () => holidayForm.reset('title'),
                                        });
                                    }}
                                    className="space-y-3 border-b border-slate-100 pb-4"
                                >
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            value={holidayForm.data.holiday_date}
                                            onChange={(e) => holidayForm.setData('holiday_date', e.target.value)}
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                            required
                                        />
                                        <select
                                            value={holidayForm.data.kind}
                                            onChange={(e) => holidayForm.setData('kind', e.target.value)}
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        >
                                            <option value="govt">Govt Holiday</option>
                                            <option value="weekly">Weekly Holiday</option>
                                            <option value="special">Special Holiday</option>
                                        </select>
                                    </div>
                                    <input
                                        type="text"
                                        value={holidayForm.data.title}
                                        onChange={(e) => holidayForm.setData('title', e.target.value)}
                                        placeholder="ছুটির নাম (যেমন: বিজয় দিবস)"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                    <select
                                        value={holidayForm.data.branch_id}
                                        onChange={(e) => holidayForm.setData('branch_id', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                    >
                                        <option value="">সকল শাখা (Global)</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name} ({b.code})
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={holidayForm.processing}
                                        className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                                    >
                                        Add Holiday
                                    </button>
                                </form>
                            )}

                            <div className="max-h-72 space-y-2 overflow-y-auto">
                                {holidays.map((h) => (
                                    <div
                                        key={h.id}
                                        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-xs"
                                    >
                                        <div>
                                            <span className="font-bold text-slate-800">{h.holiday_date}</span> —{' '}
                                            <span>{h.title}</span>{' '}
                                            <span className="text-[10px] text-slate-400">
                                                ({h.branch ? h.branch.name : 'All Branches'})
                                            </span>
                                        </div>
                                        {canManage && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.delete(`/head-office/accounting-periods/holidays/${h.id}`)
                                                }
                                                className="text-rose-500 hover:text-rose-700"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                            <h2 className="mb-3 text-sm font-bold text-slate-900">Period Reopen Audit Logs</h2>
                            <div className="max-h-96 space-y-2 overflow-y-auto">
                                {reopenLogs.length === 0 ? (
                                    <p className="text-xs text-slate-400">এখনো কোনো Reopen লগ নেই</p>
                                ) : (
                                    reopenLogs.map((l) => (
                                        <div key={l.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                                            <div className="font-bold text-slate-800">
                                                {l.branch?.name} — {l.kind.toUpperCase()} ({l.period_date})
                                            </div>
                                            <div className="mt-0.5 text-slate-600">কারণ: {l.reason}</div>
                                            <div className="mt-1 text-[10px] text-slate-400">
                                                Reopened by {l.reopened_by_user?.name}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
