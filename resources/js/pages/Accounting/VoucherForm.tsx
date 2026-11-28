import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, FilePlus2, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface LedgerAccount {
    id: number;
    code: string;
    name: string;
    type: string;
}

interface BranchBankAccountItem {
    id: number;
    ledger_account_id: number;
    bank_name: string;
    account_number: string;
    is_default: boolean;
}

interface VoucherRecord {
    id: number;
    kind: 'payment' | 'receipt' | 'journal' | 'contra';
    business_date: string;
    description: string;
    lines: Array<{ ledger_account_id: number; debit_paisa: number; credit_paisa: number }>;
}

interface Props {
    voucher: VoucherRecord | null;
    accounts: LedgerAccount[];
    bankAccounts: BranchBankAccountItem[];
    cashLedgerAccountId: number | null;
    bankLedgerAccountId: number | null;
    branch: { id: number; name: string; code: string } | null;
    dayState: { has_open_day: boolean; business_date: string | null } | null;
}

export default function VoucherForm({
    voucher,
    accounts,
    bankAccounts = [],
    cashLedgerAccountId = null,
    bankLedgerAccountId = null,
    branch,
    dayState,
}: Props) {
    const isEdit = Boolean(voucher);
    const pageErrors = (usePage().props.errors ?? {}) as Record<string, string>;
    const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
    const defaultBank = bankAccounts.find((b) => b.is_default) ?? bankAccounts[0] ?? null;

    const [txType, setTxType] = useState<'cash' | 'bank_cheque' | 'bank_cash' | 'journal' | 'bank_to_bank'>(
        isEdit ? 'journal' : 'cash',
    );
    const [selectedBankId, setSelectedBankId] = useState<number | ''>(defaultBank?.id ?? '');
    const [businessDate, setBusinessDate] = useState<string>(
        voucher?.business_date ?? dayState?.business_date ?? new Date().toISOString().slice(0, 10),
    );
    const [description, setDescription] = useState(voucher?.description ?? '');
    const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit');
    const [entryAccountId, setEntryAccountId] = useState<number | ''>('');
    const [entryAmount, setEntryAmount] = useState('');
    const [entryRef, setEntryRef] = useState('');
    const [addedLines, setAddedLines] = useState<
        Array<{ ledger_account_id: number; debit_amount: string; credit_amount: string; reference: string }>
    >(
        voucher?.lines?.map((l) => ({
            ledger_account_id: Number(l.ledger_account_id),
            debit_amount: l.debit_paisa > 0 ? (l.debit_paisa / 100).toFixed(2) : '',
            credit_amount: l.credit_paisa > 0 ? (l.credit_paisa / 100).toFixed(2) : '',
            reference: '',
        })) ?? [],
    );
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const selectedBankObj = bankAccounts.find((b) => b.id === Number(selectedBankId)) ?? null;
    const needsBankSelector = txType === 'bank_cheque' || txType === 'bank_cash' || txType === 'bank_to_bank';
    const counterLedgerId =
        txType === 'cash'
            ? cashLedgerAccountId
            : needsBankSelector
              ? (selectedBankObj?.ledger_account_id ?? bankLedgerAccountId)
              : null;

    const effectiveAccountId = txType === 'bank_cash' ? (cashLedgerAccountId ?? '') : entryAccountId;

    const summary = useMemo(() => {
        let debit = 0;
        let credit = 0;
        for (const l of addedLines) {
            debit += Number(l.debit_amount || 0);
            credit += Number(l.credit_amount || 0);
        }
        const net = debit - credit;
        const canSave =
            addedLines.length > 0 &&
            description.trim().length >= 3 &&
            (txType === 'journal'
                ? debit > 0 && Math.abs(net) < 0.001 && addedLines.length >= 2
                : Math.abs(net) > 0.001 && Boolean(counterLedgerId));
        return { debit, credit, net, canSave };
    }, [addedLines, description, txType, counterLedgerId]);

    const handleAddLine = () => {
        const amt = Number(entryAmount);
        if (!effectiveAccountId || !Number.isFinite(amt) || amt <= 0) return;

        setAddedLines((prev) => [
            ...prev,
            {
                ledger_account_id: Number(effectiveAccountId),
                debit_amount: entryType === 'debit' ? amt.toFixed(2) : '',
                credit_amount: entryType === 'credit' ? amt.toFixed(2) : '',
                reference: entryRef.trim(),
            },
        ]);
        if (txType !== 'bank_cash') {
            setEntryAccountId('');
        }
        setEntryAmount('');
        setEntryRef('');
    };

    const handleSave = () => {
        setFormError(null);
        if (!branch?.id) {
            setFormError('কোনো শাখা নির্ধারিত নেই। উপরের অফিস সিলেক্টর থেকে শাখা নির্বাচন করুন।');
            return;
        }
        if (addedLines.length === 0) {
            setFormError('কমপক্ষে ১টি অ্যাকাউন্ট লাইন Add করুন।');
            return;
        }
        if (description.trim().length < 3) {
            setFormError('Description কমপক্ষে ৩ অক্ষরের হতে হবে।');
            return;
        }
        if (txType !== 'journal' && !counterLedgerId) {
            setFormError('Cash in Hand বা Bank লেজার ম্যাপ করা নেই।');
            return;
        }
        if (!summary.canSave) {
            setFormError('ভাউচারের Debit ও Credit সমান হতে হবে।');
            return;
        }

        const payloadLines = addedLines.map((l) => ({
            ledger_account_id: l.ledger_account_id,
            debit_amount: l.debit_amount,
            credit_amount: l.credit_amount,
        }));

        let kind: 'payment' | 'receipt' | 'journal' | 'contra' = voucher?.kind ?? 'journal';
        if (txType !== 'journal' && counterLedgerId) {
            const isContra = txType === 'bank_cash' || txType === 'bank_to_bank';
            if (summary.net > 0) {
                kind = isContra ? 'contra' : 'payment';
                payloadLines.push({
                    ledger_account_id: counterLedgerId,
                    debit_amount: '',
                    credit_amount: summary.net.toFixed(2),
                });
            } else {
                kind = isContra ? 'contra' : 'receipt';
                payloadLines.push({
                    ledger_account_id: counterLedgerId,
                    debit_amount: Math.abs(summary.net).toFixed(2),
                    credit_amount: '',
                });
            }
        }

        const refs = addedLines.map((l) => l.reference).filter(Boolean);
        const fullDesc = refs.length > 0 ? `${description.trim()} (Ref: ${refs.join(', ')})` : description.trim();

        setSubmitting(true);
        const options = {
            onError: (errs: Record<string, string>) => {
                const firstErr = Object.values(errs).find(Boolean);
                setFormError(firstErr ? String(firstErr) : 'ভাউচার সংরক্ষণ করা যায়নি।');
            },
            onFinish: () => setSubmitting(false),
        };

        if (isEdit && voucher) {
            router.put(
                `/accounting/vouchers/${voucher.id}`,
                { kind, business_date: businessDate, description: fullDesc, lines: payloadLines },
                options,
            );
        } else {
            router.post(
                '/accounting/vouchers',
                { branch_id: branch.id, kind, business_date: businessDate, description: fullDesc, lines: payloadLines },
                options,
            );
        }
    };

    return (
        <AdminLayout>
            <Head title={isEdit ? 'Voucher Edit' : 'Voucher Create'} />

            <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">
                            {isEdit ? 'Voucher Edit' : 'Voucher Create'}
                        </h1>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {branch ? `শাখা: ${branch.code} — ${branch.name}` : 'শাখা নির্ধারিত নেই'} • Transaction Date:{' '}
                            <strong>{formatDate(businessDate)}</strong>
                        </p>
                    </div>
                    <Link
                        href="/accounting?tab=vouchers"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to List
                    </Link>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Transaction Date</label>
                            <input
                                type="date"
                                value={businessDate}
                                onChange={(e) => setBusinessDate(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Transaction Type</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={txType}
                                onChange={(val) => {
                                    setTxType((val as typeof txType) ?? 'cash');
                                    if (!isEdit) setAddedLines([]);
                                }}
                                items={[
                                    { value: 'cash', label: 'Cash' },
                                    { value: 'bank_cheque', label: 'Bank (Cheque)' },
                                    { value: 'bank_cash', label: 'Bank (Cash) — Contra' },
                                    { value: 'journal', label: 'Journal' },
                                    { value: 'bank_to_bank', label: 'BankToBank — Contra' },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Bank Account</label>
                            {needsBankSelector ? (
                                <ComboSelect
                                    size="sm"
                                    value={selectedBankId ? Number(selectedBankId) : null}
                                    onChange={(val) => setSelectedBankId(val ? Number(val) : '')}
                                    items={bankAccounts.map((b) => ({
                                        value: b.id,
                                        label: `${b.bank_name} (${b.account_number})${b.is_default ? ' [Default]' : ''}`,
                                    }))}
                                    placeholder={bankAccounts.length > 0 ? 'ব্যাংক অ্যাকাউন্ট নির্বাচন করুন' : 'Default Bank Ledger'}
                                />
                            ) : (
                                <input
                                    type="text"
                                    disabled
                                    value={txType === 'cash' ? 'Cash in Hand (Auto)' : 'N/A (Manual Journal)'}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-500"
                                />
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Description <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="ভাউচারের বিবরণ লিখুন"
                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                        />
                    </div>

                    <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Voucher Type</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={entryType}
                                onChange={(val) => setEntryType((val as 'debit' | 'credit') ?? 'debit')}
                                items={[
                                    { value: 'debit', label: 'Debit' },
                                    { value: 'credit', label: 'Credit' },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Account</label>
                            {txType === 'bank_cash' ? (
                                <input
                                    type="text"
                                    disabled
                                    value={
                                        cashLedgerAccountId && accountMap.get(cashLedgerAccountId)
                                            ? `${accountMap.get(cashLedgerAccountId)!.code} — ${accountMap.get(cashLedgerAccountId)!.name} (Auto)`
                                            : 'Cash in Hand (Auto)'
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-600"
                                />
                            ) : (
                                <ComboSelect
                                    size="sm"
                                    value={entryAccountId ? Number(entryAccountId) : null}
                                    onChange={(val) => setEntryAccountId(val ? Number(val) : '')}
                                    items={(txType === 'bank_to_bank'
                                        ? accounts.filter((a) => a.type === 'asset')
                                        : accounts
                                    ).map((a) => ({
                                        value: a.id,
                                        label: `${a.code} — ${a.name} (${a.type})`,
                                        keywords: `${a.code} ${a.name} ${a.type}`,
                                    }))}
                                    placeholder="লেজার অ্যাকাউন্ট নির্বাচন করুন"
                                />
                            )}
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Debit</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={entryType !== 'debit'}
                                value={entryType === 'debit' ? entryAmount : '0'}
                                onChange={(e) => setEntryAmount(e.target.value)}
                                placeholder="0.00"
                                className={`w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs ${
                                    entryType !== 'debit' ? 'bg-slate-100 text-slate-400' : 'bg-white'
                                }`}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Credit</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={entryType !== 'credit'}
                                value={entryType === 'credit' ? entryAmount : '0'}
                                onChange={(e) => setEntryAmount(e.target.value)}
                                placeholder="0.00"
                                className={`w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs ${
                                    entryType !== 'credit' ? 'bg-slate-100 text-slate-400' : 'bg-white'
                                }`}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Reference</label>
                            <input
                                type="text"
                                value={entryRef}
                                onChange={(e) => setEntryRef(e.target.value)}
                                placeholder="ঐচ্ছিক রেফারেন্স / চেক নং"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs"
                            />
                        </div>
                    </div>

                    {(formError || Object.keys(pageErrors).length > 0) && (
                        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>{formError || Object.values(pageErrors).join(' • ')}</div>
                        </div>
                    )}

                    {branch && dayState && !dayState.has_open_day && (
                        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                            <span>
                                <strong>সতর্কতা:</strong> {branch.name} শাখার বিজনেস ডে ওপেন নেই।
                            </span>
                            <Link href="/branch/process" className="font-bold underline">
                                Day Open করুন →
                            </Link>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={handleAddLine}
                            disabled={!effectiveAccountId || Number(entryAmount) <= 0}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={submitting}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                        >
                            <FilePlus2 className="h-3.5 w-3.5" />
                            {submitting ? 'Saving...' : isEdit ? 'Update' : 'Save'}
                        </button>
                    </div>

                    {addedLines.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2">Account</th>
                                        <th className="px-3 py-2">Reference</th>
                                        <th className="px-3 py-2 text-right">Debit (৳)</th>
                                        <th className="px-3 py-2 text-right">Credit (৳)</th>
                                        <th className="px-3 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {addedLines.map((l, idx) => {
                                        const acc = accountMap.get(l.ledger_account_id);
                                        return (
                                            <tr key={idx} className="border-t border-slate-100">
                                                <td className="px-3 py-2 font-medium text-slate-800">
                                                    {acc ? `${acc.code} — ${acc.name}` : `#${l.ledger_account_id}`}
                                                </td>
                                                <td className="px-3 py-2 text-slate-500">{l.reference || '—'}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{l.debit_amount || '0.00'}</td>
                                                <td className="px-3 py-2 text-right font-semibold">{l.credit_amount || '0.00'}</td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddedLines((prev) => prev.filter((_, i) => i !== idx))}
                                                        className="rounded p-1 text-rose-500 hover:bg-rose-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {txType !== 'journal' && Math.abs(summary.net) > 0.001 && counterLedgerId && (
                                        <tr className="border-t border-slate-200 bg-emerald-50/60">
                                            <td className="px-3 py-2 font-bold text-emerald-900">
                                                {(() => {
                                                    const cAcc = accountMap.get(counterLedgerId);
                                                    return cAcc ? `${cAcc.code} — ${cAcc.name} (Auto Counter)` : 'Cash / Bank (Auto)';
                                                })()}
                                            </td>
                                            <td className="px-3 py-2 text-emerald-700">Auto-balanced ({txType.toUpperCase()})</td>
                                            <td className="px-3 py-2 text-right font-bold text-emerald-900">
                                                {summary.net < 0 ? Math.abs(summary.net).toFixed(2) : '0.00'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-emerald-900">
                                                {summary.net > 0 ? summary.net.toFixed(2) : '0.00'}
                                            </td>
                                            <td className="px-3 py-2 text-right text-[10px] text-emerald-700">Auto</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
