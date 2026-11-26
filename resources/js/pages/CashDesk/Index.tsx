import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Landmark, Lock, Play, Send, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface DayState {
    has_open_day: boolean;
    business_date: string | null;
}

interface CashierSession {
    id: number;
    business_date: string;
    opened_by: number;
    opening_cash_paisa: number;
    expected_closing_paisa: number | null;
    actual_closing_paisa: number | null;
    variance_paisa: number | null;
    status: string;
    note: string | null;
    opener?: { id: number; name: string } | null;
    reviewer?: { id: number; name: string } | null;
}

interface LedgerAccount {
    id: number;
    code: string;
    name: string;
}

interface BankLine {
    id: number;
    statement_date: string;
    reference_no: string | null;
    description: string;
    debit_paisa: number;
    credit_paisa: number;
    matched_journal_entry_id: number | null;
    ledger_account?: LedgerAccount | null;
    matched_journal?: { id: number; business_date: string; description: string } | null;
}

interface JournalOption {
    id: number;
    business_date: string;
    description: string;
}

interface Props {
    branch: Branch | null;
    branches: Branch[];
    canSelectBranch: boolean;
    dayState: DayState | null;
    todaySession: CashierSession | null;
    expectedTodayPaisa: number | null;
    sessions: CashierSession[];
    bankAccounts: LedgerAccount[];
    bankLines: BankLine[];
    recentJournals: JournalOption[];
    currentUserId: number;
    canOperate: boolean;
}

const fmt = (paisa: number | null | undefined): string =>
    paisa === null || paisa === undefined
        ? '-'
        : `৳${(paisa / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CashDeskIndex({
    branch,
    branches,
    canSelectBranch,
    dayState,
    todaySession,
    expectedTodayPaisa,
    sessions,
    bankAccounts,
    bankLines,
    recentJournals,
    currentUserId,
    canOperate,
}: Props) {
    const [tab, setTab] = useState<'cash' | 'bank'>('cash');
    const [matchJournalByLine, setMatchJournalByLine] = useState<Record<number, number | null>>({});

    const openForm = useForm<{ branch_id: string | number; business_date: string; opening_cash: string; cash_desk?: string }>({
        branch_id: branch?.id ?? '',
        business_date: dayState?.business_date ?? new Date().toISOString().slice(0, 10),
        opening_cash: '0',
    });

    const submitForm = useForm<{ actual_closing: string; note: string; cash_desk?: string }>({
        actual_closing: expectedTodayPaisa !== null ? (expectedTodayPaisa / 100).toFixed(2) : '0',
        note: '',
    });

    const bankForm = useForm<{
        branch_id: string | number;
        ledger_account_id: string | number;
        statement_date: string;
        reference_no: string;
        description: string;
        debit_amount: string;
        credit_amount: string;
    }>({
        branch_id: branch?.id ?? '',
        ledger_account_id: bankAccounts[0]?.id ?? '',
        statement_date: dayState?.business_date ?? new Date().toISOString().slice(0, 10),
        reference_no: '',
        description: '',
        debit_amount: '',
        credit_amount: '',
    });

    return (
        <AdminLayout>
            <Head title="Cash Desk & Bank Reconciliation" />

            <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Cash Desk & Bank Reconciliation</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {branch ? `শাখা: ${branch.name} (${branch.code})` : 'শাখা নির্ধারিত নেই'}
                            {dayState?.has_open_day && ` • Open Date: ${formatDate(dayState.business_date)}`}
                        </p>
                    </div>

                    {canSelectBranch && branches.length > 0 && (
                        <div className="w-60">
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={branch?.id ?? null}
                                onChange={(val) => val && router.get('/cash-desk', { branch_id: val }, { preserveState: false })}
                                items={branches.map((b) => ({
                                    value: b.id,
                                    label: `${b.name} (${b.code})`,
                                    keywords: `${b.name} ${b.code}`,
                                }))}
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTab('cash')}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold ${
                            tab === 'cash' ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-700'
                        }`}
                    >
                        <Lock className="h-3.5 w-3.5" />
                        Daily Cash Session
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('bank')}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold ${
                            tab === 'bank' ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-700'
                        }`}
                    >
                        <Landmark className="h-3.5 w-3.5" />
                        Bank Reconciliation
                    </button>
                </div>

                {tab === 'cash' && (
                    <div className="space-y-5">
                        {canOperate && dayState?.has_open_day && !todaySession && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    openForm.post('/cash-desk/open');
                                }}
                                className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                            >
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                                        Opening Cash ({formatDate(dayState.business_date)})
                                    </label>
                                    <input
                                        type="text"
                                        value={openForm.data.opening_cash}
                                        onChange={(e) => openForm.setData('opening_cash', e.target.value)}
                                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={openForm.processing}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"
                                >
                                    <Play className="h-3.5 w-3.5" />
                                    Open Cash Session
                                </button>
                                {openForm.errors.cash_desk && (
                                    <p className="w-full text-xs font-medium text-rose-600">{openForm.errors.cash_desk}</p>
                                )}
                            </form>
                        )}

                        {canOperate && todaySession && (todaySession.status === 'open' || todaySession.status === 'rejected') && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    submitForm.post(`/cash-desk/sessions/${todaySession.id}/submit`);
                                }}
                                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-sm font-bold text-slate-900">
                                        আজকের ক্যাশ সাবমিশন ({formatDate(todaySession.business_date)})
                                    </h2>
                                    <div className="text-xs font-semibold text-slate-600">
                                        Opening: {fmt(todaySession.opening_cash_paisa)} | Expected Closing: {fmt(expectedTodayPaisa)}
                                    </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">Actual Cash Count (৳)</label>
                                        <input
                                            type="text"
                                            value={submitForm.data.actual_closing}
                                            onChange={(e) => submitForm.setData('actual_closing', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">Note (ঐচ্ছিক)</label>
                                        <input
                                            type="text"
                                            value={submitForm.data.note}
                                            onChange={(e) => submitForm.setData('note', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={submitForm.processing}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    Submit Cash Session
                                </button>
                            </form>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">Cash Session History</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">তারিখ</th>
                                            <th className="py-2">Opening</th>
                                            <th className="py-2">Expected</th>
                                            <th className="py-2">Actual</th>
                                            <th className="py-2">Variance</th>
                                            <th className="py-2">Status</th>
                                            <th className="py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-6 text-center text-slate-400">কোনো ক্যাশ সেশন নেই</td>
                                            </tr>
                                        ) : (
                                            sessions.map((s) => (
                                                <tr key={s.id} className="border-b border-slate-50">
                                                    <td className="py-2.5 font-semibold">{formatDate(s.business_date)}</td>
                                                    <td className="py-2.5">{fmt(s.opening_cash_paisa)}</td>
                                                    <td className="py-2.5">{fmt(s.expected_closing_paisa)}</td>
                                                    <td className="py-2.5">{fmt(s.actual_closing_paisa)}</td>
                                                    <td className="py-2.5 font-bold">{fmt(s.variance_paisa)}</td>
                                                    <td className="py-2.5">
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">
                                                            {s.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5">
                                                        {s.status === 'submitted' && canOperate && s.opened_by !== currentUserId && (
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => router.post(`/cash-desk/sessions/${s.id}/review`, { approve: true })}
                                                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white"
                                                                >
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => router.post(`/cash-desk/sessions/${s.id}/review`, { approve: false })}
                                                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white"
                                                                >
                                                                    <XCircle className="h-3 w-3" />
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'bank' && (
                    <div className="space-y-5">
                        {canOperate && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    bankForm.post('/cash-desk/bank-lines', {
                                        onSuccess: () => bankForm.reset('description', 'debit_amount', 'credit_amount', 'reference_no'),
                                    });
                                }}
                                className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:grid-cols-6"
                            >
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Bank / Asset Account</label>
                                    <ComboSelect
                                        size="sm"
                                        clearable={false}
                                        value={bankForm.data.ledger_account_id ? Number(bankForm.data.ledger_account_id) : null}
                                        onChange={(val) => bankForm.setData('ledger_account_id', val ?? '')}
                                        items={bankAccounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Statement Date</label>
                                    <input
                                        type="date"
                                        value={bankForm.data.statement_date}
                                        onChange={(e) => bankForm.setData('statement_date', e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Debit (৳)</label>
                                    <input
                                        type="text"
                                        value={bankForm.data.debit_amount}
                                        onChange={(e) => bankForm.setData('debit_amount', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Credit (৳)</label>
                                    <input
                                        type="text"
                                        value={bankForm.data.credit_amount}
                                        onChange={(e) => bankForm.setData('credit_amount', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                    />
                                </div>
                                <div className="md:col-span-4">
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
                                    <input
                                        type="text"
                                        value={bankForm.data.description}
                                        onChange={(e) => bankForm.setData('description', e.target.value)}
                                        placeholder="ব্যাংক স্টেটমেন্ট বিবরণ"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button type="submit" className="w-full rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white">
                                        Add Bank Line
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-500">
                                        <th className="py-2">তারিখ</th>
                                        <th className="py-2">ব্যাংক ও বিবরণ</th>
                                        <th className="py-2">Debit / Credit</th>
                                        <th className="py-2">Match Journal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bankLines.map((line) => (
                                        <tr key={line.id} className="border-b border-slate-50">
                                            <td className="py-2.5 font-semibold">{formatDate(line.statement_date)}</td>
                                            <td className="py-2.5">
                                                <div className="font-semibold">{line.ledger_account?.name}</div>
                                                <div className="text-[11px] text-slate-500">{line.description}</div>
                                            </td>
                                            <td className="py-2.5">
                                                {line.debit_paisa > 0 ? `Dr ${fmt(line.debit_paisa)}` : `Cr ${fmt(line.credit_paisa)}`}
                                            </td>
                                            <td className="py-2.5">
                                                {line.matched_journal ? (
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                        Matched: {formatDate(line.matched_journal.business_date)}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-52">
                                                            <ComboSelect
                                                                size="sm"
                                                                value={matchJournalByLine[line.id] ?? null}
                                                                onChange={(val) =>
                                                                    setMatchJournalByLine((prev) => ({ ...prev, [line.id]: val }))
                                                                }
                                                                items={recentJournals.map((j) => ({
                                                                    value: j.id,
                                                                    label: `${formatDate(j.business_date)} — ${j.description}`,
                                                                }))}
                                                                placeholder="জার্নাল নির্বাচন করুন"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const jid = matchJournalByLine[line.id];
                                                                if (jid) {
                                                                    router.post(`/cash-desk/bank-lines/${line.id}/match`, { journal_entry_id: jid });
                                                                }
                                                            }}
                                                            className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-bold text-white"
                                                        >
                                                            Match
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
