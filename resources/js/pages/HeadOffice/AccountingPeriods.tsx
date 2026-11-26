import { Head, router, useForm } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    CalendarPlus,
    FileSpreadsheet,
    Lock,
    Power,
    RotateCcw,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

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
    accounting_enabled: boolean;
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
    accounting_enabled: boolean;
    area_name: string | null;
    zone_name: string | null;
    initial_date: string | null;
    financial_year: string | null;
    open_day: string | null;
    last_closed_day: string | null;
    last_month_date: string | null;
    last_month_status: string | null;
}

interface BranchMonthProcess {
    id: number;
    branch_id: number;
    month_date: string;
    status: string;
    llp_summary: { estimated_llp_amount?: number } | null;
    summary: { loans_disbursed?: number } | null;
    branch?: { id: number; name: string; code: string } | null;
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
    monthProcesses: BranchMonthProcess[];
    defaultMonthDate: string;
    reopenLogs: ReopenLog[];
    filters: { zone_id: number | null; area_id: number | null };
    canManage: boolean;
    isSuperAdmin: boolean;
}

export default function AccountingPeriods({
    financialYears,
    currentFySuggestion,
    holidays,
    branches,
    zones,
    areas,
    branchMonitor,
    monthProcesses,
    defaultMonthDate,
    reopenLogs,
    filters,
    canManage,
    isSuperAdmin,
}: Props) {
    const [tab, setTab] = useState<'monitor' | 'monthly' | 'initial' | 'fy' | 'holidays'>('monitor');
    const [reopenFyId, setReopenFyId] = useState<number | null>(null);
    const fyReopenForm = useForm({ reason: '' });

    const enabledCount = branchMonitor.filter((b) => b.accounting_enabled).length;
    const legacyCount = branchMonitor.length - enabledCount;

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

    const llpForm = useForm<{ branch_id: string; month_date: string; period?: string }>({
        branch_id: '',
        month_date: defaultMonthDate,
    });

    const batchForm = useForm<{ branch_id: string; business_date: string; period?: string }>({
        branch_id: '',
        business_date: defaultMonthDate,
    });

    const monthlyForm = useForm<{ branch_id: string; month_date: string; close_month: boolean; period?: string }>({
        branch_id: '',
        month_date: defaultMonthDate,
        close_month: false,
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
                        { id: 'monitor', label: 'Branch Monitor & Pilot Control', icon: Building2 },
                        { id: 'monthly', label: 'Monthly Process & LLP', icon: ShieldCheck },
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
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">সকল শাখার Pilot মোড ও Day / Month স্ট্যাটাস</h2>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                        একাউন্টিং চালু (Pilot ON): <strong className="text-emerald-700">{enabledCount}টি</strong> শাখা • সাধারণ MIS (Legacy OFF): <strong className="text-slate-700">{legacyCount}টি</strong> শাখা
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <div className="w-44">
                                        <ComboSelect
                                            size="sm"
                                            value={filters.zone_id ?? null}
                                            onChange={(val) => applyFilter(val ? String(val) : '', '')}
                                            items={zones.map((z) => ({ value: z.id, label: z.name }))}
                                            placeholder="All Zones"
                                        />
                                    </div>
                                    <div className="w-44">
                                        <ComboSelect
                                            size="sm"
                                            value={filters.area_id ?? null}
                                            onChange={(val) => applyFilter(String(filters.zone_id ?? ''), val ? String(val) : '')}
                                            items={areas
                                                .filter((a) => !filters.zone_id || a.zone_id === filters.zone_id)
                                                .map((a) => ({ value: a.id, label: a.name }))}
                                            placeholder="All Areas"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">শাখা</th>
                                            <th className="py-2">Zone / Area</th>
                                            <th className="py-2">হিসাব-নিকাশ মোড (Pilot)</th>
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
                                                    {row.branch_code ? `${row.branch_code} - ` : ''}{row.branch_name}
                                                </td>
                                                <td className="py-2.5 text-slate-500">
                                                    {row.zone_name ?? '-'} / {row.area_name ?? '-'}
                                                </td>
                                                <td className="py-2.5">
                                                    <button
                                                        type="button"
                                                        disabled={!canManage}
                                                        onClick={() =>
                                                            router.patch(
                                                                `/head-office/accounting-periods/branches/${row.branch_id}/toggle-accounting`,
                                                                { accounting_enabled: !row.accounting_enabled },
                                                                { preserveScroll: true },
                                                            )
                                                        }
                                                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                                                            row.accounting_enabled
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                        title="ক্লিক করে Pilot Accounting চালু বা বন্ধ করুন"
                                                    >
                                                        <Power className="h-3 w-3" />
                                                        {row.accounting_enabled ? 'Pilot ON (হিসাব চালু)' : 'Legacy OFF (আগের মোড)'}
                                                    </button>
                                                </td>
                                                <td className="py-2.5 text-slate-700">{row.initial_date ? formatDate(row.initial_date) : 'Not Set'}</td>
                                                <td className="py-2.5">
                                                    {row.open_day ? (
                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                            {formatDate(row.open_day)} (Open)
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">None</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 text-slate-600">{formatDate(row.last_closed_day)}</td>
                                                <td className="py-2.5 text-slate-600">
                                                    {row.last_month_date
                                                        ? `${formatDate(row.last_month_date)} (${row.last_month_status})`
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
                                    <ComboSelect
                                        size="sm"
                                        value={reopenForm.data.branch_id ? Number(reopenForm.data.branch_id) : null}
                                        onChange={(val) => reopenForm.setData('branch_id', val ? String(val) : '')}
                                        items={branches.map((b) => ({
                                            value: b.id,
                                            label: `${b.name} (${b.code})`,
                                            keywords: `${b.name} ${b.code}`,
                                        }))}
                                        placeholder="শাখা নির্বাচন করুন"
                                    />
                                    <ComboSelect
                                        size="sm"
                                        clearable={false}
                                        value={reopenForm.data.kind}
                                        onChange={(val) => reopenForm.setData('kind', val ?? 'day')}
                                        items={[
                                            { value: 'day', label: 'Day' },
                                            { value: 'month', label: 'Month (Month-End Date)' },
                                        ]}
                                    />
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

                {tab === 'monthly' && (
                    <div className="space-y-5">
                        <div className="grid gap-5 lg:grid-cols-3">
                            {/* 1. Month-End Auto Batch */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    batchForm.post('/head-office/accounting-periods/month-end-batch');
                                }}
                                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    <h3 className="text-sm font-bold text-slate-900">১. Month-End Auto Batch</h3>
                                </div>
                                <p className="text-xs text-slate-500">
                                    খোলা কর্মদিবসে সকল সক্রিয় সঞ্চয়ে মাসিক মুনাফা পোস্ট ও LLP Journal তৈরি করুন।
                                </p>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">শাখা (ঐচ্ছিক)</label>
                                    <ComboSelect
                                        size="sm"
                                        value={batchForm.data.branch_id ? Number(batchForm.data.branch_id) : null}
                                        onChange={(val) => batchForm.setData('branch_id', val ? String(val) : '')}
                                        items={branches.map((b) => ({
                                            value: b.id,
                                            label: `${b.name} (${b.code})${b.accounting_enabled ? ' [Pilot ON]' : ''}`,
                                            keywords: `${b.name} ${b.code}`,
                                        }))}
                                        placeholder="সকল Pilot-ON শাখা"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Business Date</label>
                                    <input
                                        type="date"
                                        value={batchForm.data.business_date}
                                        onChange={(e) => batchForm.setData('business_date', e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!canManage || batchForm.processing}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Run Auto Profit + LLP
                                </button>
                            </form>

                            {/* 2. LLP Voucher Process */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    llpForm.post('/head-office/accounting-periods/llp');
                                }}
                                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                                    <h3 className="text-sm font-bold text-slate-900">২. LLP Voucher Process</h3>
                                </div>
                                <p className="text-xs text-slate-500">
                                    মাসের সক্রিয় ঋণ পোর্টফোলিওর ওপর ভিত্তি করে Loan Loss Provisioning (LLP) প্রস্তুত করুন।
                                </p>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">শাখা (ঐচ্ছিক)</label>
                                    <ComboSelect
                                        size="sm"
                                        value={llpForm.data.branch_id ? Number(llpForm.data.branch_id) : null}
                                        onChange={(val) => llpForm.setData('branch_id', val ? String(val) : '')}
                                        items={branches.map((b) => ({
                                            value: b.id,
                                            label: `${b.name} (${b.code})${b.accounting_enabled ? ' [Pilot ON]' : ''}`,
                                            keywords: `${b.name} ${b.code}`,
                                        }))}
                                        placeholder="সকল Pilot-ON শাখা"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">মাসের যেকোনো তারিখ</label>
                                    <input
                                        type="date"
                                        value={llpForm.data.month_date}
                                        onChange={(e) => llpForm.setData('month_date', e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!canManage || llpForm.processing}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <FileSpreadsheet className="h-3.5 w-3.5" />
                                    Run LLP Voucher Process
                                </button>
                            </form>

                            {/* 3. Monthly Process & Month Close */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    monthlyForm.post('/head-office/accounting-periods/monthly');
                                }}
                                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-brand" />
                                    <h3 className="text-sm font-bold text-slate-900">৩. Monthly Process & Month Close</h3>
                                </div>
                                <p className="text-xs text-slate-500">
                                    মাসের সব কর্মদিবস Close হওয়ার পর মাসিক সামারি তৈরি ও Month Close করুন।
                                </p>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">শাখা (ঐচ্ছিক)</label>
                                    <ComboSelect
                                        size="sm"
                                        value={monthlyForm.data.branch_id ? Number(monthlyForm.data.branch_id) : null}
                                        onChange={(val) => monthlyForm.setData('branch_id', val ? String(val) : '')}
                                        items={branches.map((b) => ({
                                            value: b.id,
                                            label: `${b.name} (${b.code})${b.accounting_enabled ? ' [Pilot ON]' : ''}`,
                                            keywords: `${b.name} ${b.code}`,
                                        }))}
                                        placeholder="সকল Pilot-ON শাখা"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">মাসের যেকোনো তারিখ</label>
                                    <input
                                        type="date"
                                        value={monthlyForm.data.month_date}
                                        onChange={(e) => monthlyForm.setData('month_date', e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={monthlyForm.data.close_month}
                                        onChange={(e) => monthlyForm.setData('close_month', e.target.checked)}
                                        className="rounded border-slate-300"
                                    />
                                    মাসটি চূড়ান্তভাবে বন্ধ (Month Close) করুন
                                </label>
                                <button
                                    type="submit"
                                    disabled={!canManage || monthlyForm.processing}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                                >
                                    <Lock className="h-3.5 w-3.5" />
                                    {monthlyForm.data.close_month ? 'Run & Close Month' : 'Process Monthly Summary'}
                                </button>
                            </form>
                        </div>

                        {/* Monthly Process History */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                            <h3 className="mb-3 text-sm font-bold text-slate-900">সাম্প্রতিক Monthly Process লগ</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">শাখা</th>
                                            <th className="py-2">মাস</th>
                                            <th className="py-2">স্ট্যাটাস</th>
                                            <th className="py-2">LLP পরিমাণ</th>
                                            <th className="py-2">লোন ডিসবার্স</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthProcesses.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-slate-400">
                                                    এখনো কোনো Monthly Process সম্পন্ন হয়নি
                                                </td>
                                            </tr>
                                        ) : (
                                            monthProcesses.map((m) => (
                                                <tr key={m.id} className="border-b border-slate-50">
                                                    <td className="py-2 font-semibold text-slate-800">
                                                        {m.branch ? `${m.branch.name} (${m.branch.code})` : `Branch #${m.branch_id}`}
                                                    </td>
                                                    <td className="py-2 text-slate-700">{formatDate(m.month_date)}</td>
                                                    <td className="py-2">
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                                m.status === 'closed'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                            }`}
                                                        >
                                                            {m.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 text-slate-700">
                                                        {m.llp_summary?.estimated_llp_amount !== undefined
                                                            ? `৳${m.llp_summary.estimated_llp_amount.toLocaleString()}`
                                                            : '-'}
                                                    </td>
                                                    <td className="py-2 text-slate-600">{m.summary?.loans_disbursed ?? 0} টি</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Financial Year</label>
                            <ComboSelect
                                value={initialForm.data.financial_year_id ? Number(initialForm.data.financial_year_id) : null}
                                onChange={(val) => initialForm.setData('financial_year_id', val ?? '')}
                                items={financialYears
                                    .filter((f) => !f.closed_at)
                                    .map((f) => ({
                                        value: f.id,
                                        label: `${f.name} (${formatDate(f.starts_on)} → ${formatDate(f.ends_on)})`,
                                        keywords: f.name,
                                    }))}
                                placeholder="অর্থবছর নির্বাচন করুন"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Branch</label>
                            <ComboSelect
                                value={initialForm.data.branch_id ? Number(initialForm.data.branch_id) : null}
                                onChange={(val) => initialForm.setData('branch_id', val ?? '')}
                                items={branches.map((b) => ({
                                    value: b.id,
                                    label: `${b.name} (${b.code})`,
                                    keywords: `${b.name} ${b.code}`,
                                }))}
                                placeholder="শাখা নির্বাচন করুন"
                            />
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
                                                {formatDate(fy.starts_on)} → {formatDate(fy.ends_on)}
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
                                                {isSuperAdmin && fy.closed_at && (
                                                    reopenFyId === fy.id ? (
                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                fyReopenForm.post(
                                                                    `/head-office/accounting-periods/financial-years/${fy.id}/reopen`,
                                                                    {
                                                                        onSuccess: () => {
                                                                            setReopenFyId(null);
                                                                            fyReopenForm.reset();
                                                                        },
                                                                    },
                                                                );
                                                            }}
                                                            className="flex items-center gap-1.5"
                                                        >
                                                            <input
                                                                type="text"
                                                                value={fyReopenForm.data.reason}
                                                                onChange={(e) => fyReopenForm.setData('reason', e.target.value)}
                                                                placeholder="Rollback কারণ লিখুন"
                                                                className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                                                                required
                                                                minLength={5}
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={fyReopenForm.processing}
                                                                className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setReopenFyId(null)}
                                                                className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </form>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setReopenFyId(fy.id)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                                                        >
                                                            <RotateCcw className="h-3 w-3" />
                                                            Rollback / Reopen
                                                        </button>
                                                    )
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
                                        <ComboSelect
                                            size="sm"
                                            clearable={false}
                                            value={holidayForm.data.kind}
                                            onChange={(val) => holidayForm.setData('kind', val ?? 'govt')}
                                            items={[
                                                { value: 'govt', label: 'Govt Holiday' },
                                                { value: 'weekly', label: 'Weekly Holiday' },
                                                { value: 'special', label: 'Special Holiday' },
                                            ]}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={holidayForm.data.title}
                                        onChange={(e) => holidayForm.setData('title', e.target.value)}
                                        placeholder="ছুটির নাম (যেমন: বিজয় দিবস)"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                    <ComboSelect
                                        size="sm"
                                        value={holidayForm.data.branch_id ? Number(holidayForm.data.branch_id) : null}
                                        onChange={(val) => holidayForm.setData('branch_id', val ? String(val) : '')}
                                        items={branches.map((b) => ({
                                            value: b.id,
                                            label: `${b.name} (${b.code})`,
                                            keywords: `${b.name} ${b.code}`,
                                        }))}
                                        placeholder="সকল শাখা (Global)"
                                    />
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
                                            <span className="font-bold text-slate-800">{formatDate(h.holiday_date)}</span> —{' '}
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
                                                {l.branch?.name ?? 'All Branches (Financial Year)'} — {l.kind.toUpperCase()} ({formatDate(l.period_date)})
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
