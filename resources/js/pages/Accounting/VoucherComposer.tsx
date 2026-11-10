import {
    FinanceErrors,
    FinancePanel,
    Paisa,
    financeButton,
    financeInput,
    financeSecondary,
} from '@/components/finance/workspace';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { accountingUrl } from '@/lib/accounting-navigation';
import {
    buildGuidedVoucher,
    parseVoucherAmount,
    validateVoucherLines,
    type DraftLine,
    type VoucherLine,
    type VoucherMode,
} from '@/lib/accounting-voucher';
import { Link, useForm } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowRightLeft,
    ArrowUpRight,
    BookOpen,
    Check,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { AccountingProps } from './types';

const modes = [
    {
        id: 'receipt',
        title: 'টাকা জমা',
        english: 'Receipt',
        description: 'নগদ বা ব্যাংকে টাকা এসেছে',
        icon: ArrowDownLeft,
    },
    {
        id: 'payment',
        title: 'টাকা খরচ',
        english: 'Payment',
        description: 'নগদ বা ব্যাংক থেকে টাকা গেছে',
        icon: ArrowUpRight,
    },
    {
        id: 'transfer',
        title: 'হিসাব স্থানান্তর',
        english: 'Transfer',
        description: 'এক নগদ/ব্যাংক হিসাব থেকে অন্যটিতে',
        icon: ArrowRightLeft,
    },
    {
        id: 'journal',
        title: 'সমন্বয় জার্নাল',
        english: 'Advanced journal',
        description: 'নিজে একাধিক debit/credit line লিখুন',
        icon: BookOpen,
    },
] as const;
export function AccountOptions({
    accounts,
}: {
    accounts: AccountingProps['accounts'];
}) {
    return (
        <>
            {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                    {account.code} · {account.name}
                </option>
            ))}
        </>
    );
}
export default function VoucherComposer({
    branchId,
    branches,
    accounts,
    periods,
    today,
    filters,
}: AccountingProps) {
    const [mode, setMode] = useState<VoucherMode>(
        (filters.mode as VoucherMode) || 'receipt',
    );
    const [cash, setCash] = useState('');
    const [counter, setCounter] = useState('');
    const [amount, setAmount] = useState('');
    const [lines, setLines] = useState<DraftLine[]>([
        { account_id: '', debit: '', credit: '' },
        { account_id: '', debit: '', credit: '' },
    ]);
    const [prepared, setPrepared] = useState<VoucherLine[]>([]);
    const [reviewOpen, setReviewOpen] = useState(false);
    const [error, setError] = useState('');
    const form = useForm({
        branch_id: branchId,
        business_date: today,
        description: '',
        idempotency_key: crypto.randomUUID(),
        lines: [] as VoucherLine[],
    });
    const activeAccounts = accounts.filter((account) =>
        Boolean(account.is_active),
    );
    const assets = activeAccounts.filter((account) => account.type === 'asset');
    const bankBranch = branches.find((branch) => branch.id === branchId);
    const label = modes.find((item) => item.id === mode)!;
    const datePeriod = periods.find(
        (period) =>
            period.starts_on <= form.data.business_date &&
            period.ends_on >= form.data.business_date,
    );
    const dateOpen =
        datePeriod &&
        !datePeriod.closed_at &&
        !periods.some(
            (period) =>
                period.closed_at && period.ends_on >= form.data.business_date,
        );
    const totals = (rows: VoucherLine[]) =>
        rows.reduce((sum, row) => sum + BigInt(row.debit_paisa), 0n);
    const draftTotals = lines.reduce(
        (sum, line) => {
            try {
                return {
                    debit: sum.debit + parseVoucherAmount(line.debit || '0'),
                    credit: sum.credit + parseVoucherAmount(line.credit || '0'),
                };
            } catch {
                return sum;
            }
        },
        { debit: 0n, credit: 0n },
    );
    const updateLine = (index: number, key: keyof DraftLine, value: string) =>
        setLines(
            lines.map((line, i) =>
                i === index ? { ...line, [key]: value } : line,
            ),
        );
    const prepare = () => {
        setError('');
        form.clearErrors();
        try {
            const result =
                mode === 'journal'
                    ? validateVoucherLines(lines)
                    : buildGuidedVoucher(mode, cash, counter, amount);
            setPrepared(result);
            setReviewOpen(true);
        } catch (exception) {
            setError(
                exception instanceof Error
                    ? exception.message
                    : 'তথ্যগুলো যাচাই করুন।',
            );
        }
    };
    return (
        <>
            <div
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                role="group"
                aria-label="Voucher type"
            >
                {modes.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                            setMode(item.id);
                            setCounter('');
                            setError('');
                            form.clearErrors();
                        }}
                        aria-pressed={mode === item.id}
                        className={`relative rounded-xl border p-4 text-left transition ${mode === item.id ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 dark:bg-emerald-950' : 'border-slate-200 bg-white hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900'}`}
                    >
                        <item.icon
                            className={`mb-3 size-5 ${mode === item.id ? 'text-emerald-700' : 'text-slate-400'}`}
                        />
                        <span className="block text-sm font-semibold">
                            {item.title}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                            {item.english}
                        </span>
                        {mode === item.id && (
                            <Check className="absolute top-4 right-4 size-4 text-emerald-700" />
                        )}
                    </button>
                ))}
            </div>
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_290px]">
                <FinancePanel
                    title={`${label.title} ভাউচার`}
                    description={label.description}
                >
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            prepare();
                        }}
                        className="space-y-5 p-5"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                লেনদেনের তারিখ
                                <input
                                    aria-label="Business date"
                                    required
                                    type="date"
                                    max={today}
                                    value={form.data.business_date}
                                    onChange={(event) =>
                                        form.setData(
                                            'business_date',
                                            event.target.value,
                                        )
                                    }
                                    className={financeInput}
                                />
                                <span
                                    className={`mt-1.5 block text-[11px] ${dateOpen ? 'text-emerald-700' : 'text-amber-700'}`}
                                >
                                    {dateOpen
                                        ? 'এই তারিখে হিসাবকাল খোলা আছে'
                                        : 'এই তারিখে posting-এর জন্য খোলা হিসাবকাল প্রয়োজন'}
                                </span>
                            </label>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                                <p className="text-[10px] text-slate-400">
                                    নির্বাচিত শাখা
                                </p>
                                <p className="mt-1 text-sm font-semibold">
                                    {bankBranch
                                        ? `${bankBranch.code} · ${bankBranch.name}`
                                        : 'শাখা নির্বাচন করুন'}
                                </p>
                                <p className="mt-1 text-[10px] text-slate-500">
                                    উপরের branch selector থেকে পরিবর্তন করুন
                                </p>
                            </div>
                        </div>
                        {mode !== 'journal' ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                    {mode === 'transfer'
                                        ? 'যে হিসাব থেকে যাবে'
                                        : mode === 'receipt'
                                          ? 'যে নগদ/ব্যাংক হিসাবে জমা হবে'
                                          : 'যে নগদ/ব্যাংক হিসাব থেকে যাবে'}
                                    <select
                                        aria-label="Cash or source account"
                                        required
                                        className={financeInput}
                                        value={cash}
                                        onChange={(event) =>
                                            setCash(event.target.value)
                                        }
                                    >
                                        <option value="">
                                            নির্ধারিত নগদ/ব্যাংক GL বেছে নিন
                                        </option>
                                        <AccountOptions accounts={assets} />
                                    </select>
                                </label>
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                    {mode === 'transfer'
                                        ? 'যে হিসাবে জমা হবে'
                                        : mode === 'receipt'
                                          ? 'কোন খাত থেকে টাকা এসেছে'
                                          : 'কোন খাতে টাকা দেওয়া হয়েছে'}
                                    <select
                                        aria-label="Counter or destination account"
                                        required
                                        className={financeInput}
                                        value={counter}
                                        onChange={(event) =>
                                            setCounter(event.target.value)
                                        }
                                    >
                                        <option value="">
                                            সংশ্লিষ্ট GL হিসাব বেছে নিন
                                        </option>
                                        <AccountOptions
                                            accounts={(mode === 'transfer'
                                                ? assets
                                                : activeAccounts
                                            ).filter(
                                                (account) =>
                                                    String(account.id) !== cash,
                                            )}
                                        />
                                    </select>
                                </label>
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                    টাকার পরিমাণ
                                    <input
                                        aria-label="Voucher amount"
                                        required
                                        inputMode="decimal"
                                        pattern="[0-9]+([.][0-9]{1,2})?"
                                        placeholder="0.00"
                                        className={`${financeInput} text-lg font-semibold tabular-nums`}
                                        value={amount}
                                        onChange={(event) =>
                                            setAmount(event.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full min-w-[560px] text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="p-3">GL হিসাব</th>
                                            <th className="p-3">Debit (৳)</th>
                                            <th className="p-3">Credit (৳)</th>
                                            <th className="w-10" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((line, index) => (
                                            <tr
                                                key={index}
                                                className="border-t border-slate-100 dark:border-slate-800"
                                            >
                                                <td className="min-w-52 p-2">
                                                    <select
                                                        required
                                                        aria-label={`Line ${index + 1} account`}
                                                        className={`${financeInput} mt-0`}
                                                        value={line.account_id}
                                                        onChange={(event) =>
                                                            updateLine(
                                                                index,
                                                                'account_id',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    >
                                                        <option value="">
                                                            হিসাব নির্বাচন
                                                        </option>
                                                        <AccountOptions
                                                            accounts={
                                                                activeAccounts
                                                            }
                                                        />
                                                    </select>
                                                </td>
                                                <td className="w-36 p-2">
                                                    <input
                                                        aria-label={`Line ${index + 1} debit`}
                                                        inputMode="decimal"
                                                        className={`${financeInput} mt-0 text-right`}
                                                        placeholder="0.00"
                                                        value={line.debit}
                                                        onChange={(event) =>
                                                            updateLine(
                                                                index,
                                                                'debit',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="w-36 p-2">
                                                    <input
                                                        aria-label={`Line ${index + 1} credit`}
                                                        inputMode="decimal"
                                                        className={`${financeInput} mt-0 text-right`}
                                                        placeholder="0.00"
                                                        value={line.credit}
                                                        onChange={(event) =>
                                                            updateLine(
                                                                index,
                                                                'credit',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <button
                                                        type="button"
                                                        aria-label={`Remove line ${index + 1}`}
                                                        disabled={
                                                            lines.length <= 2
                                                        }
                                                        onClick={() =>
                                                            setLines(
                                                                lines.filter(
                                                                    (_, i) =>
                                                                        i !==
                                                                        index,
                                                                ),
                                                            )
                                                        }
                                                        className="rounded p-2 text-slate-400 hover:text-rose-700 disabled:opacity-30"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="border-t bg-slate-50 font-semibold dark:bg-slate-800">
                                        <tr>
                                            <td className="p-3">মোট</td>
                                            <td className="p-3 text-right">
                                                <Paisa
                                                    value={draftTotals.debit}
                                                />
                                            </td>
                                            <td className="p-3 text-right">
                                                <Paisa
                                                    value={draftTotals.credit}
                                                />
                                            </td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                                <div className="flex items-center justify-between gap-3 border-t p-3">
                                    <button
                                        type="button"
                                        disabled={lines.length >= 100}
                                        className="flex items-center gap-1 text-xs font-medium text-emerald-700"
                                        onClick={() =>
                                            setLines([
                                                ...lines,
                                                {
                                                    account_id: '',
                                                    debit: '',
                                                    credit: '',
                                                },
                                            ])
                                        }
                                    >
                                        <Plus className="size-3" />
                                        আরও line
                                    </button>
                                    <span
                                        className={`text-[11px] ${draftTotals.debit === draftTotals.credit ? 'text-emerald-700' : 'text-amber-700'}`}
                                    >
                                        {draftTotals.debit ===
                                        draftTotals.credit
                                            ? 'Debit ও credit সমান'
                                            : 'Debit ও credit মিলিয়ে নিন'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                            বিবরণ / রেফারেন্স
                            <textarea
                                aria-label="Voucher description"
                                required
                                maxLength={950}
                                rows={3}
                                placeholder="কেন এই টাকা জমা/খরচ হয়েছে? প্রয়োজনে বিল বা লেনদেনের রেফারেন্স লিখুন।"
                                className={financeInput}
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <FinanceErrors
                            errors={{
                                ...form.errors,
                                ...(error ? { entry: error } : {}),
                            }}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <Link
                                className={financeSecondary}
                                href={accountingUrl('vouchers', branchId)}
                            >
                                বাতিল / তালিকায় ফিরুন
                            </Link>
                            <button
                                disabled={
                                    form.processing ||
                                    !dateOpen ||
                                    !branchId ||
                                    activeAccounts.length < 2
                                }
                                className={financeButton}
                            >
                                তথ্য যাচাই করুন
                                <ArrowUpRight className="size-4" />
                            </button>
                        </div>
                    </form>
                </FinancePanel>
                <aside className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                            জমা দিলেই টাকা পোস্ট হয় না
                        </p>
                        <ol className="mt-4 space-y-3 text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-200">
                            <li>১. আপনি ভাউচার জমা দেবেন</li>
                            <li>২. অন্য administrator যাচাই করবেন</li>
                            <li>৩. অনুমোদন হলে GL-এ পোস্ট হবে</li>
                        </ol>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                            সদস্যের ঋণ বা সঞ্চয়ের লেনদেন?
                        </p>
                        <p className="mt-2">
                            সদস্যের balance ঠিক রাখতে সংশ্লিষ্ট ledger ব্যবহার
                            করুন।
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                            <Link
                                href="/loan-ledger"
                                className="text-emerald-700 hover:underline"
                            >
                                ঋণ আদায় / Loan ledger →
                            </Link>
                            <Link
                                href="/savings-ledger"
                                className="text-emerald-700 hover:underline"
                            >
                                সঞ্চয় জমা–উত্তোলন →
                            </Link>
                        </div>
                    </div>
                    {!dateOpen && (
                        <Link
                            className="block rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
                            href={accountingUrl('periods', branchId)}
                        >
                            খোলা হিসাবকাল নেই? হিসাবকাল দেখুন →
                        </Link>
                    )}
                </aside>
            </div>
            <Dialog
                open={reviewOpen}
                onOpenChange={(open) => {
                    if (!form.processing) setReviewOpen(open);
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogTitle>জমা দেওয়ার আগে যাচাই করুন</DialogTitle>
                    <DialogDescription>
                        {label.title} · {bankBranch?.code} {bankBranch?.name} ·{' '}
                        {form.data.business_date}
                    </DialogDescription>
                    <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                        <p className="text-[11px] text-slate-500">
                            ভাউচারের পরিমাণ
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                            <Paisa value={totals(prepared)} />
                        </p>
                        <p className="mt-3 text-sm break-words">
                            {form.data.description}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[440px] text-left text-xs">
                            <thead>
                                <tr>
                                    <th className="p-3">হিসাব</th>
                                    <th className="p-3 text-right">Debit</th>
                                    <th className="p-3 text-right">Credit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prepared.map((line, index) => {
                                    const account = accounts.find(
                                        (item) => item.id === line.account_id,
                                    );
                                    return (
                                        <tr key={index} className="border-t">
                                            <td className="p-3">
                                                {account?.code} ·{' '}
                                                {account?.name}
                                            </td>
                                            <td className="p-3 text-right">
                                                <Paisa
                                                    value={line.debit_paisa}
                                                />
                                            </td>
                                            <td className="p-3 text-right">
                                                <Paisa
                                                    value={line.credit_paisa}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <FinanceErrors errors={form.errors} />
                    <p className="text-xs text-slate-500">
                        ভাউচার pending থাকবে। অন্য administrator-এর অনুমোদনের পর
                        হিসাব পোস্ট হবে।
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            disabled={form.processing}
                            className={financeSecondary}
                            onClick={() => setReviewOpen(false)}
                        >
                            তথ্য সংশোধন
                        </button>
                        <button
                            type="button"
                            disabled={form.processing}
                            className={financeButton}
                            onClick={() => {
                                form.transform((data) => ({
                                    ...data,
                                    description: `[${label.english}] ${data.description}`,
                                    lines: prepared,
                                }));
                                form.post('/accounting/journals');
                            }}
                        >
                            {form.processing
                                ? 'জমা হচ্ছে…'
                                : 'পর্যালোচনার জন্য জমা দিন'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
