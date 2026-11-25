import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    CheckCircle2,
    FilePlus2,
    Layers,
    Plus,
    Sparkles,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface LedgerAccount {
    id: number;
    code: string;
    name: string;
    type: string;
    is_active: boolean;
}

interface VoucherLine {
    ledger_account_id: number;
    debit_paisa: number;
    credit_paisa: number;
}

interface Voucher {
    id: number;
    reference: string;
    kind: string;
    business_date: string;
    description: string;
    lines: VoucherLine[];
    requested_by: number;
    status: string;
    decision_note: string | null;
    requester?: { id: number; name: string } | null;
    reviewer?: { id: number; name: string } | null;
}

interface JournalLine {
    id: number;
    ledger_account_id: number;
    debit_paisa: number;
    credit_paisa: number;
    ledger_account?: LedgerAccount | null;
}

interface JournalEntry {
    id: number;
    reference: string;
    business_date: string;
    description: string;
    creator?: { id: number; name: string } | null;
    lines: JournalLine[];
}

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface DayState {
    has_open_day: boolean;
    business_date: string | null;
}

interface Props {
    accounts: LedgerAccount[];
    vouchers: Voucher[];
    journals: JournalEntry[];
    branch: Branch | null;
    branches: Branch[];
    canSelectBranch: boolean;
    dayState: DayState | null;
    canManageCoa: boolean;
    canOperateVoucher: boolean;
    currentUserId: number;
}

const formatPaisa = (paisa: number): string => {
    return (paisa / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function AccountingIndex({
    accounts,
    vouchers,
    journals,
    branch,
    branches,
    canSelectBranch,
    dayState,
    canManageCoa,
    canOperateVoucher,
    currentUserId,
}: Props) {
    const [tab, setTab] = useState<'vouchers' | 'journals' | 'coa'>('vouchers');
    const [rejectVoucherId, setRejectVoucherId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const activeAccounts = useMemo(() => accounts.filter((a) => a.is_active), [accounts]);
    const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

    const voucherForm = useForm<{
        branch_id: string | number;
        kind: string;
        business_date: string;
        description: string;
        lines: Array<{ ledger_account_id: string | number; debit_amount: string; credit_amount: string }>;
        voucher?: string;
        accounting?: string;
    }>({
        branch_id: branch?.id ?? '',
        kind: 'payment',
        business_date: dayState?.business_date ?? new Date().toISOString().slice(0, 10),
        description: '',
        lines: [
            { ledger_account_id: '', debit_amount: '', credit_amount: '' },
            { ledger_account_id: '', debit_amount: '', credit_amount: '' },
        ],
    });

    const coaForm = useForm({
        code: '',
        name: '',
        type: 'expense',
    });

    const totals = useMemo(() => {
        let debit = 0;
        let credit = 0;
        for (const l of voucherForm.data.lines) {
            debit += Number(l.debit_amount || 0);
            credit += Number(l.credit_amount || 0);
        }
        return {
            debit: debit.toFixed(2),
            credit: credit.toFixed(2),
            balanced: debit > 0 && Math.abs(debit - credit) < 0.001,
        };
    }, [voucherForm.data.lines]);

    const updateLine = (idx: number, field: 'ledger_account_id' | 'debit_amount' | 'credit_amount', val: string | number) => {
        const next = [...voucherForm.data.lines];
        next[idx] = { ...next[idx], [field]: val };
        voucherForm.setData('lines', next);
    };

    return (
        <AdminLayout>
            <Head title="Accounting & Vouchers" />

            <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Accounting, Vouchers & Chart of Accounts</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {branch ? `শাখা: ${branch.name} (${branch.code})` : 'শাখা নির্ধারিত নেই'}
                            {dayState?.has_open_day && ` • Open Business Date: ${formatDate(dayState.business_date)}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {canSelectBranch && branches.length > 0 && (
                            <div className="w-60">
                                <ComboSelect
                                    size="sm"
                                    clearable={false}
                                    value={branch?.id ?? null}
                                    onChange={(val) =>
                                        val && router.get('/accounting', { branch_id: val }, { preserveState: false })
                                    }
                                    items={branches.map((b) => ({
                                        value: b.id,
                                        label: `${b.name} (${b.code})`,
                                        keywords: `${b.name} ${b.code}`,
                                    }))}
                                    placeholder="শাখা নির্বাচন করুন"
                                />
                            </div>
                        )}

                        {canManageCoa && (
                            <button
                                type="button"
                                onClick={() => router.post('/accounting/coa/seed')}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/5 px-3 py-2 text-xs font-bold text-brand hover:bg-brand/10"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Seed Standard MFI COA
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'vouchers', label: 'Vouchers (Maker-Checker)', icon: FilePlus2 },
                        { id: 'journals', label: 'Journal Register', icon: BookOpen },
                        { id: 'coa', label: 'Chart of Accounts (COA)', icon: Layers },
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

                {tab === 'vouchers' && (
                    <div className="space-y-5">
                        {canOperateVoucher && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    voucherForm.post('/accounting/vouchers', {
                                        onSuccess: () => voucherForm.reset('description'),
                                    });
                                }}
                                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-slate-900">নতুন ভাউচার তৈরি (Voucher Entry)</h2>
                                    <span className="text-xs font-semibold text-slate-500">
                                        Debit: ৳{totals.debit} | Credit: ৳{totals.credit}
                                    </span>
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">Voucher Type</label>
                                        <ComboSelect
                                            size="sm"
                                            clearable={false}
                                            value={voucherForm.data.kind}
                                            onChange={(val) => voucherForm.setData('kind', val ?? 'payment')}
                                            items={[
                                                { value: 'payment', label: 'Payment Voucher' },
                                                { value: 'receipt', label: 'Receipt Voucher' },
                                                { value: 'journal', label: 'Journal Voucher' },
                                                { value: 'contra', label: 'Contra Voucher' },
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">Business Date</label>
                                        <input
                                            type="date"
                                            value={voucherForm.data.business_date}
                                            onChange={(e) => voucherForm.setData('business_date', e.target.value)}
                                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">Description / বিবরণ</label>
                                        <input
                                            type="text"
                                            value={voucherForm.data.description}
                                            onChange={(e) => voucherForm.setData('description', e.target.value)}
                                            placeholder="ভাউচারের বিবরণ লিখুন"
                                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {voucherForm.data.lines.map((line, idx) => (
                                        <div key={idx} className="grid items-center gap-2 md:grid-cols-12">
                                            <div className="md:col-span-6">
                                                <ComboSelect
                                                    size="sm"
                                                    value={line.ledger_account_id ? Number(line.ledger_account_id) : null}
                                                    onChange={(val) => updateLine(idx, 'ledger_account_id', val ?? '')}
                                                    items={activeAccounts.map((a) => ({
                                                        value: a.id,
                                                        label: `${a.code} — ${a.name} (${a.type})`,
                                                        keywords: `${a.code} ${a.name} ${a.type}`,
                                                    }))}
                                                    placeholder="লেজার অ্যাকাউন্ট নির্বাচন করুন"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <input
                                                    type="text"
                                                    value={line.debit_amount}
                                                    onChange={(e) => updateLine(idx, 'debit_amount', e.target.value)}
                                                    placeholder="Debit (৳)"
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <input
                                                    type="text"
                                                    value={line.credit_amount}
                                                    onChange={(e) => updateLine(idx, 'credit_amount', e.target.value)}
                                                    placeholder="Credit (৳)"
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                                />
                                            </div>
                                            <div className="flex justify-end md:col-span-2">
                                                {voucherForm.data.lines.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            voucherForm.setData(
                                                                'lines',
                                                                voucherForm.data.lines.filter((_, i) => i !== idx),
                                                            )
                                                        }
                                                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {(voucherForm.errors.accounting || voucherForm.errors.voucher) && (
                                    <p className="text-xs font-medium text-rose-600">
                                        {voucherForm.errors.accounting || voucherForm.errors.voucher}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            voucherForm.setData('lines', [
                                                ...voucherForm.data.lines,
                                                { ledger_account_id: '', debit_amount: '', credit_amount: '' },
                                            ])
                                        }
                                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Line
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!totals.balanced || voucherForm.processing}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                                    >
                                        <FilePlus2 className="h-3.5 w-3.5" />
                                        Submit Voucher
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                                সাম্প্রতিক ভাউচারসমূহ (Voucher Queue)
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">তারিখ</th>
                                            <th className="py-2">ধরন</th>
                                            <th className="py-2">বিবরণ ও লাইন</th>
                                            <th className="py-2">প্রস্তুতকারী</th>
                                            <th className="py-2">স্ট্যাটাস</th>
                                            <th className="py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vouchers.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-slate-400">
                                                    কোনো ভাউচার পাওয়া যায়নি
                                                </td>
                                            </tr>
                                        ) : (
                                            vouchers.map((v) => {
                                                const isOwn = v.requested_by === currentUserId;
                                                return (
                                                    <tr key={v.id} className="border-b border-slate-50 align-top">
                                                        <td className="py-2.5 font-semibold text-slate-800">
                                                            {formatDate(v.business_date)}
                                                        </td>
                                                        <td className="py-2.5 uppercase text-slate-600">{v.kind}</td>
                                                        <td className="py-2.5">
                                                            <div className="font-semibold text-slate-800">{v.description}</div>
                                                            <div className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                                                                {v.lines.map((l, i) => {
                                                                    const acc = accountMap.get(l.ledger_account_id);
                                                                    return (
                                                                        <div key={i}>
                                                                            {acc ? `${acc.code} ${acc.name}` : `#${l.ledger_account_id}`}:{' '}
                                                                            {l.debit_paisa > 0
                                                                                ? `Dr ৳${formatPaisa(l.debit_paisa)}`
                                                                                : `Cr ৳${formatPaisa(l.credit_paisa)}`}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 text-slate-600">{v.requester?.name ?? '-'}</td>
                                                        <td className="py-2.5">
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                                    v.status === 'approved'
                                                                        ? 'bg-emerald-100 text-emerald-700'
                                                                        : v.status === 'rejected'
                                                                          ? 'bg-rose-100 text-rose-700'
                                                                          : 'bg-amber-100 text-amber-700'
                                                                }`}
                                                            >
                                                                {v.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5">
                                                            {v.status === 'pending' && canOperateVoucher && !isOwn && (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => router.post(`/accounting/vouchers/${v.id}/approve`)}
                                                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                                                                    >
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        Approve
                                                                    </button>
                                                                    {rejectVoucherId === v.id ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <input
                                                                                type="text"
                                                                                value={rejectReason}
                                                                                onChange={(e) => setRejectReason(e.target.value)}
                                                                                placeholder="কারণ"
                                                                                className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    router.post(
                                                                                        `/accounting/vouchers/${v.id}/reject`,
                                                                                        { decision_note: rejectReason },
                                                                                        {
                                                                                            onSuccess: () => {
                                                                                                setRejectVoucherId(null);
                                                                                                setRejectReason('');
                                                                                            },
                                                                                        },
                                                                                    );
                                                                                }}
                                                                                className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white"
                                                                            >
                                                                                Confirm
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setRejectVoucherId(v.id)}
                                                                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700"
                                                                        >
                                                                            <XCircle className="h-3 w-3" />
                                                                            Reject
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {v.status === 'pending' && isOwn && (
                                                                <span className="text-[10px] text-slate-400">অন্যের অনুমোদন প্রয়োজন</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'journals' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <h2 className="mb-3 text-sm font-bold text-slate-900">Posted Journal Register</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-500">
                                        <th className="py-2">তারিখ</th>
                                        <th className="py-2">বিবরণ</th>
                                        <th className="py-2">লেজার এন্ট্রি (Debit / Credit)</th>
                                        <th className="py-2">Posted By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {journals.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-slate-400">
                                                কোনো জার্নাল এন্ট্রি পাওয়া যায়নি
                                            </td>
                                        </tr>
                                    ) : (
                                        journals.map((j) => (
                                            <tr key={j.id} className="border-b border-slate-50 align-top">
                                                <td className="py-2.5 font-semibold text-slate-800">
                                                    {formatDate(j.business_date)}
                                                </td>
                                                <td className="py-2.5 text-slate-700">{j.description}</td>
                                                <td className="py-2.5 space-y-0.5">
                                                    {j.lines.map((l) => (
                                                        <div key={l.id} className="text-[11px]">
                                                            <span className="font-semibold text-slate-800">
                                                                {l.ledger_account ? `${l.ledger_account.code} ${l.ledger_account.name}` : `#${l.ledger_account_id}`}
                                                            </span>
                                                            {' — '}
                                                            {l.debit_paisa > 0 ? (
                                                                <span className="text-emerald-700">Dr ৳{formatPaisa(l.debit_paisa)}</span>
                                                            ) : (
                                                                <span className="text-indigo-700">Cr ৳{formatPaisa(l.credit_paisa)}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="py-2.5 text-slate-600">{j.creator?.name ?? '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'coa' && (
                    <div className="space-y-5">
                        {canManageCoa && (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    coaForm.post('/accounting/coa', {
                                        onSuccess: () => coaForm.reset('code', 'name'),
                                    });
                                }}
                                className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:grid-cols-4"
                            >
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Account Code</label>
                                    <input
                                        type="text"
                                        value={coaForm.data.code}
                                        onChange={(e) => coaForm.setData('code', e.target.value)}
                                        placeholder="যেমন: 5050"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Account Name</label>
                                    <input
                                        type="text"
                                        value={coaForm.data.name}
                                        onChange={(e) => coaForm.setData('name', e.target.value)}
                                        placeholder="যেমন: Office Rent"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Account Type</label>
                                    <ComboSelect
                                        size="sm"
                                        clearable={false}
                                        value={coaForm.data.type}
                                        onChange={(val) => coaForm.setData('type', val ?? 'expense')}
                                        items={[
                                            { value: 'asset', label: 'Asset' },
                                            { value: 'liability', label: 'Liability' },
                                            { value: 'equity', label: 'Equity' },
                                            { value: 'income', label: 'Income' },
                                            { value: 'expense', label: 'Expense' },
                                        ]}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={coaForm.processing}
                                    className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                                >
                                    Add Account
                                </button>
                            </form>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-500">
                                        <th className="py-2">কোড</th>
                                        <th className="py-2">অ্যাকাউন্টের নাম</th>
                                        <th className="py-2">ধরন</th>
                                        <th className="py-2">স্ট্যাটাস</th>
                                        {canManageCoa && <th className="py-2">Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((a) => (
                                        <tr key={a.id} className="border-b border-slate-50">
                                            <td className="py-2 font-bold text-slate-800">{a.code}</td>
                                            <td className="py-2 text-slate-700">{a.name}</td>
                                            <td className="py-2 uppercase text-slate-500">{a.type}</td>
                                            <td className="py-2">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                        a.is_active
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                >
                                                    {a.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {canManageCoa && (
                                                <td className="py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => router.patch(`/accounting/coa/${a.id}/toggle`)}
                                                        className="text-[11px] font-semibold text-brand hover:underline"
                                                    >
                                                        {a.is_active ? 'Disable' : 'Enable'}
                                                    </button>
                                                </td>
                                            )}
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
