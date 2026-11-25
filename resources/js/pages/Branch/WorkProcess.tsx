import { Head, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarCheck,
    CalendarClock,
    CheckCircle2,
    FileSpreadsheet,
    Lock,
    Play,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface BranchInfo {
    id: number;
    name: string;
    code: string;
}

interface DayState {
    has_open_day: boolean;
    business_date: string | null;
    status: string;
    opened_at: string | null;
    financial_year?: string | null;
    initial_date?: string | null;
    suggested_next_date?: string | null;
}

interface DaySummary {
    admissions_count: number;
    loans_submitted: number;
    loans_disbursed: number;
    disbursed_amount: number;
    savings_opened: number;
}

interface DayPeriod {
    id: number;
    period_date: string;
    status: string;
    opened_at: string | null;
    closed_at: string | null;
    close_reference: string | null;
    summary: DaySummary | null;
    opened_by_user?: { id: number; name: string } | null;
    closed_by_user?: { id: number; name: string } | null;
}

interface MonthProcess {
    id: number;
    month_date: string;
    status: string;
    llp_processed_at: string | null;
    llp_summary: {
        active_loans?: number;
        active_portfolio?: number;
        estimated_llp_amount?: number;
    } | null;
    processed_at: string;
    closed_at: string | null;
    summary: {
        closed_days_count?: number;
        admissions_count?: number;
        loans_disbursed?: number;
        disbursed_amount?: number;
        savings_opened?: number;
    } | null;
}

interface HolidayItem {
    id: number;
    holiday_date: string;
    title: string;
    kind: string;
}

interface Props {
    branch: BranchInfo | null;
    branches: BranchInfo[];
    canSelectBranch: boolean;
    dayState: DayState | null;
    todaySummary: DaySummary | null;
    recentDays: DayPeriod[];
    monthProcesses: MonthProcess[];
    upcomingHolidays: HolidayItem[];
    defaultMonthDate: string;
    canManage: boolean;
}

export default function WorkProcess({
    branch,
    branches,
    canSelectBranch,
    dayState,
    todaySummary,
    recentDays,
    monthProcesses,
    upcomingHolidays,
    defaultMonthDate,
    canManage,
}: Props) {
    const [activeTab, setActiveTab] = useState<'start' | 'complete' | 'llp' | 'monthly'>(
        dayState?.has_open_day ? 'complete' : 'start',
    );

    const startForm = useForm<{ branch_id: string | number; date: string; allow_holiday: boolean; period?: string }>({
        branch_id: branch?.id ?? '',
        date: dayState?.suggested_next_date ?? defaultMonthDate,
        allow_holiday: false,
    });

    const completeForm = useForm<{ branch_id: string | number; date: string; reference: string; period?: string }>({
        branch_id: branch?.id ?? '',
        date: dayState?.business_date ?? '',
        reference: '',
    });

    const llpForm = useForm<{ branch_id: string | number; month_date: string; period?: string }>({
        branch_id: branch?.id ?? '',
        month_date: defaultMonthDate,
    });

    const monthlyForm = useForm<{ branch_id: string | number; month_date: string; close_month: boolean; period?: string }>({
        branch_id: branch?.id ?? '',
        month_date: defaultMonthDate,
        close_month: false,
    });

    const handleBranchChange = (branchId: string) => {
        router.get('/branch/process', { branch_id: branchId }, { preserveState: false });
    };

    return (
        <AdminLayout>
            <Head title="Work Process (Day Open / Close)" />

            <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
                {/* Header & Active Business Date Banner */}
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-brand" />
                            <h1 className="text-lg font-bold text-slate-900">
                                Branch Work Process
                            </h1>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {branch
                                ? `শাখা: ${branch.name} (${branch.code})`
                                : 'কোনো শাখা নির্ধারিত নেই'}
                            {dayState?.financial_year && ` • অর্থবছর: ${dayState.financial_year}`}
                            {dayState?.initial_date && ` • Initial Date: ${formatDate(dayState.initial_date)}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {canSelectBranch && branches.length > 0 && (
                            <div className="w-60">
                                <ComboSelect
                                    size="sm"
                                    clearable={false}
                                    value={branch?.id ?? null}
                                    onChange={(val) => val && handleBranchChange(String(val))}
                                    items={branches.map((b) => ({
                                        value: b.id,
                                        label: `${b.name} (${b.code})`,
                                        keywords: `${b.name} ${b.code}`,
                                    }))}
                                    placeholder="শাখা নির্বাচন করুন"
                                />
                            </div>
                        )}

                        {dayState?.has_open_day ? (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span>কর্মদিবস খোলা: {formatDate(dayState.business_date)}</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <span>
                                    {dayState
                                        ? 'কোনো কর্মদিবস খোলা নেই (Day Closed)'
                                        : 'Head Office থেকে Manage Day Initial সেট করা হয়নি'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* gBanker-Style Process Menu Tabs */}
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                    {[
                        { id: 'start', label: 'Start Work Process', sub: 'Day Open করুন', icon: Play },
                        { id: 'complete', label: 'Complete Work Process', sub: 'Day Close করুন', icon: Lock },
                        { id: 'llp', label: 'LLP Voucher Process', sub: 'প্রভিশন ক্যালকুলেশন', icon: FileSpreadsheet },
                        { id: 'monthly', label: 'Monthly Process', sub: 'মাসিক সামারি ও ক্লোজ', icon: CalendarCheck },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                                    active
                                        ? 'border-brand bg-brand/5 text-brand shadow-xs'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                        active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="truncate text-xs font-bold">{tab.label}</div>
                                    <div className="truncate text-[11px] text-slate-500">{tab.sub}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    {activeTab === 'start' && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                startForm.post('/branch/process/start-work');
                            }}
                            className="max-w-lg space-y-4"
                        >
                            <h2 className="text-sm font-bold text-slate-900">Start Work Process (Day Open)</h2>
                            <p className="text-xs text-slate-500">
                                প্রতিদিনের লেনদেন শুরু করার আগে আজকের বিজনেস ডেট ওপেন করুন। আগের দিন ক্লোজ না করলে নতুন দিন খোলা যাবে না।
                            </p>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Business Date</label>
                                <input
                                    type="date"
                                    value={startForm.data.date}
                                    onChange={(e) => startForm.setData('date', e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    required
                                />
                                {startForm.errors.period && (
                                    <p className="mt-1 text-xs font-medium text-rose-600">{startForm.errors.period}</p>
                                )}
                            </div>

                            <label className="flex items-center gap-2 text-xs text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={startForm.data.allow_holiday}
                                    onChange={(e) => startForm.setData('allow_holiday', e.target.checked)}
                                    className="rounded border-slate-300"
                                />
                                ছুটির দিনেও বিশেষ প্রয়োজনে কর্মদিবস খুলতে চাই
                            </label>

                            <button
                                type="submit"
                                disabled={!canManage || startForm.processing || Boolean(dayState?.has_open_day)}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                            >
                                <Play className="h-3.5 w-3.5" />
                                Start Work Process
                            </button>
                        </form>
                    )}

                    {activeTab === 'complete' && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-slate-900">Complete Work Process (Day Close)</h2>
                            {dayState?.has_open_day && todaySummary ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                                        {[
                                            { label: 'মেম্বার ভর্তি', val: todaySummary.admissions_count },
                                            { label: 'লোন আবেদন', val: todaySummary.loans_submitted },
                                            { label: 'লোন ডিসবার্স', val: todaySummary.loans_disbursed },
                                            { label: 'বিতরণকৃত টাকা', val: `৳${todaySummary.disbursed_amount.toLocaleString()}` },
                                            { label: 'সঞ্চয় খোলা', val: todaySummary.savings_opened },
                                        ].map((item) => (
                                            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                                <div className="text-[11px] text-slate-500">{item.label}</div>
                                                <div className="mt-1 text-base font-bold text-slate-900">{item.val}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            completeForm.post('/branch/process/complete-work');
                                        }}
                                        className="max-w-lg space-y-3"
                                    >
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700">
                                                Close Reference / নোট (ঐচ্ছিক)
                                            </label>
                                            <input
                                                type="text"
                                                value={completeForm.data.reference}
                                                onChange={(e) => completeForm.setData('reference', e.target.value)}
                                                placeholder="যেমন: Cashbook verified"
                                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                            />
                                        </div>
                                        {completeForm.errors.period && (
                                            <p className="text-xs font-medium text-rose-600">{completeForm.errors.period}</p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={!canManage || completeForm.processing}
                                            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                                        >
                                            <Lock className="h-3.5 w-3.5" />
                                            Complete Work Process ({formatDate(dayState.business_date)} Close করুন)
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <p className="text-xs text-slate-500">
                                    বর্তমানে কোনো খোলা কর্মদিবস নেই। আগে Start Work Process থেকে দিন ওপেন করুন।
                                </p>
                            )}
                        </div>
                    )}

                    {activeTab === 'llp' && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                llpForm.post('/branch/process/llp');
                            }}
                            className="max-w-lg space-y-4"
                        >
                            <h2 className="text-sm font-bold text-slate-900">LLP Voucher Process</h2>
                            <p className="text-xs text-slate-500">
                                মাসের সক্রিয় ঋণ পোর্টফোলিওর ওপর ভিত্তি করে Loan Loss Provisioning (LLP) স্ন্যাপশট প্রস্তুত করুন।
                            </p>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">মাসের যেকোনো তারিখ</label>
                                <input
                                    type="date"
                                    value={llpForm.data.month_date}
                                    onChange={(e) => llpForm.setData('month_date', e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    required
                                />
                                {llpForm.errors.period && (
                                    <p className="mt-1 text-xs font-medium text-rose-600">{llpForm.errors.period}</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={!canManage || llpForm.processing}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                Run LLP Voucher Process
                            </button>
                        </form>
                    )}

                    {activeTab === 'monthly' && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                monthlyForm.post('/branch/process/monthly');
                            }}
                            className="max-w-lg space-y-4"
                        >
                            <h2 className="text-sm font-bold text-slate-900">Monthly Process & Month Close</h2>
                            <p className="text-xs text-slate-500">
                                মাসের সব কর্মদিবস Close করার পর মাসিক সামারি তৈরি ও Month Close করুন। Month Close হয়ে গেলে ওই মাসে আর কোনো এন্ট্রি করা যাবে না।
                            </p>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">মাসের যেকোনো তারিখ</label>
                                <input
                                    type="date"
                                    value={monthlyForm.data.month_date}
                                    onChange={(e) => monthlyForm.setData('month_date', e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    required
                                />
                                {monthlyForm.errors.period && (
                                    <p className="mt-1 text-xs font-medium text-rose-600">{monthlyForm.errors.period}</p>
                                )}
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
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {monthlyForm.data.close_month ? 'Run & Close Month' : 'Process Monthly Summary'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Recent Days & Monthly Processes Tables */}
                <div className="grid gap-5 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                            সাম্প্রতিক কর্মদিবস (Recent Days)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-500">
                                        <th className="py-2">তারিখ</th>
                                        <th className="py-2">স্ট্যাটাস</th>
                                        <th className="py-2">Open By</th>
                                        <th className="py-2">Close By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentDays.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-slate-400">
                                                এখনো কোনো কর্মদিবস শুরু হয়নি
                                            </td>
                                        </tr>
                                    ) : (
                                        recentDays.map((d) => (
                                            <tr key={d.id} className="border-b border-slate-50">
                                                <td className="py-2 font-semibold text-slate-800">{formatDate(d.period_date)}</td>
                                                <td className="py-2">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                            d.status === 'open'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-slate-100 text-slate-700'
                                                        }`}
                                                    >
                                                        {d.status === 'open' ? 'Open' : 'Closed'}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-slate-600">{d.opened_by_user?.name ?? '-'}</td>
                                                <td className="py-2 text-slate-600">{d.closed_by_user?.name ?? '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                                Monthly Process স্ট্যাটাস
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">মাস</th>
                                            <th className="py-2">স্ট্যাটাস</th>
                                            <th className="py-2">LLP</th>
                                            <th className="py-2">ডিসবার্স</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthProcesses.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-6 text-center text-slate-400">
                                                    এখনো কোনো Monthly Process হয়নি
                                                </td>
                                            </tr>
                                        ) : (
                                            monthProcesses.map((m) => (
                                                <tr key={m.id} className="border-b border-slate-50">
                                                    <td className="py-2 font-semibold text-slate-800">{formatDate(m.month_date)}</td>
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
                                                    <td className="py-2 text-slate-600">
                                                        {m.llp_summary?.estimated_llp_amount !== undefined
                                                            ? `৳${m.llp_summary.estimated_llp_amount.toLocaleString()}`
                                                            : '-'}
                                                    </td>
                                                    <td className="py-2 text-slate-600">
                                                        {m.summary?.loans_disbursed ?? 0} টি
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {upcomingHolidays.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                                    ছুটির দিন (Holidays)
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {upcomingHolidays.map((h) => (
                                        <span
                                            key={h.id}
                                            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800"
                                        >
                                            {formatDate(h.holiday_date)} — {h.title}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
