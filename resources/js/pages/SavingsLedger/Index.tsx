import { Head, router, useForm } from '@inertiajs/react';
import { PiggyBank, PlusCircle, TrendingUp } from 'lucide-react';
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

interface SavingsAccount {
    id: number;
    account_no: string;
    profit_rate: string;
    balance_paisa: number;
    held_paisa: number;
    opened_date: string;
    status: string;
    member_admission?: { id: number; applicant_name_bn: string | null; applicant_name_en: string | null; member_code: string | null } | null;
    savings_product?: { id: number; product_name: string; product_code: string | null } | null;
}

interface SavingsTx {
    id: number;
    kind: string;
    business_date: string;
    amount_paisa: number;
    payment_mode: string;
    savings_account?: { id: number; account_no: string } | null;
}

interface MemberItem {
    id: number;
    applicant_name_bn: string | null;
    applicant_name_en: string | null;
    member_code: string | null;
}

interface ProductItem {
    id: number;
    name: string;
    code: string | null;
    interest_rate: number | null;
}

interface Props {
    branch: Branch | null;
    branches: Branch[];
    canSelectBranch: boolean;
    dayState: DayState | null;
    accounts: SavingsAccount[];
    transactions: SavingsTx[];
    members: MemberItem[];
    savingsProducts: ProductItem[];
    canOperate: boolean;
}

const fmt = (paisa: number): string =>
    `৳${(paisa / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SavingsLedgerIndex({
    branch,
    branches,
    canSelectBranch,
    dayState,
    accounts,
    transactions,
    members,
    savingsProducts,
    canOperate,
}: Props) {
    const [tab, setTab] = useState<'accounts' | 'open' | 'transactions'>('accounts');
    const [amounts, setAmounts] = useState<Record<number, string>>({});

    const openForm = useForm({
        branch_id: branch?.id ?? '',
        member_admission_id: '',
        savings_product_id: '',
        profit_rate: '6',
        opened_date: dayState?.business_date ?? new Date().toISOString().slice(0, 10),
    });

    const bDate = dayState?.business_date ?? new Date().toISOString().slice(0, 10);

    return (
        <AdminLayout>
            <Head title="Savings Ledger & Profit" />

            <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Savings Sub-Ledger & Profit Calculation</h1>
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
                                onChange={(val) => val && router.get('/savings-ledger', { branch_id: val }, { preserveState: false })}
                                items={branches.map((b) => ({
                                    value: b.id,
                                    label: `${b.name} (${b.code})`,
                                    keywords: `${b.name} ${b.code}`,
                                }))}
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'accounts', label: 'Savings Accounts', icon: PiggyBank },
                        { id: 'open', label: 'Open Savings Account', icon: PlusCircle },
                        { id: 'transactions', label: 'Transactions Register', icon: TrendingUp },
                    ].map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id as typeof tab)}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold ${
                                    active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-700'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {tab === 'accounts' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-500">
                                        <th className="py-2">Account & Member</th>
                                        <th className="py-2">Balance</th>
                                        <th className="py-2">Held</th>
                                        <th className="py-2">Rate</th>
                                        <th className="py-2">Deposit / Withdraw / Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((acc) => (
                                        <tr key={acc.id} className="border-b border-slate-50">
                                            <td className="py-2.5">
                                                <div className="font-bold text-slate-800">{acc.account_no}</div>
                                                <div className="text-[11px] text-slate-500">
                                                    {acc.member_admission?.applicant_name_bn || acc.member_admission?.applicant_name_en} ({acc.member_admission?.member_code})
                                                </div>
                                            </td>
                                            <td className="py-2.5 font-bold text-emerald-700">{fmt(acc.balance_paisa)}</td>
                                            <td className="py-2.5 text-amber-700">{fmt(acc.held_paisa)}</td>
                                            <td className="py-2.5">{acc.profit_rate}%</td>
                                            <td className="py-2.5">
                                                {canOperate && acc.status === 'active' && (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={amounts[acc.id] ?? ''}
                                                            onChange={(e) => setAmounts((p) => ({ ...p, [acc.id]: e.target.value }))}
                                                            placeholder="৳ Amount"
                                                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const amt = amounts[acc.id];
                                                                if (amt) {
                                                                    router.post(`/savings-ledger/${acc.id}/deposit`, {
                                                                        business_date: bDate,
                                                                        amount: amt,
                                                                        payment_mode: 'cash',
                                                                    });
                                                                }
                                                            }}
                                                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white"
                                                        >
                                                            Deposit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const amt = amounts[acc.id];
                                                                if (amt) {
                                                                    router.post(`/savings-ledger/${acc.id}/withdraw`, {
                                                                        business_date: bDate,
                                                                        amount: amt,
                                                                        payment_mode: 'cash',
                                                                    });
                                                                }
                                                            }}
                                                            className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white"
                                                        >
                                                            Withdraw
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                router.post(`/savings-ledger/${acc.id}/profit`, { business_date: bDate })
                                                            }
                                                            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white"
                                                        >
                                                            Post Profit
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

                {tab === 'open' && canOperate && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            openForm.post('/savings-ledger/open', {
                                onSuccess: () => setTab('accounts'),
                            });
                        }}
                        className="grid max-w-2xl gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:grid-cols-2"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Member</label>
                            <ComboSelect
                                size="sm"
                                value={openForm.data.member_admission_id ? Number(openForm.data.member_admission_id) : null}
                                onChange={(val) => openForm.setData('member_admission_id', val ? String(val) : '')}
                                items={members.map((m) => ({
                                    value: m.id,
                                    label: `${m.member_code ?? ''} — ${m.applicant_name_bn || m.applicant_name_en}`,
                                }))}
                                placeholder="সদস্য নির্বাচন করুন"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Savings Product</label>
                            <ComboSelect
                                size="sm"
                                value={openForm.data.savings_product_id ? Number(openForm.data.savings_product_id) : null}
                                onChange={(val) => openForm.setData('savings_product_id', val ? String(val) : '')}
                                items={savingsProducts.map((p) => ({ value: p.id, label: p.code ? `${p.code} — ${p.name}` : p.name }))}
                                placeholder="প্রোডাক্ট নির্বাচন করুন"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Annual Profit Rate (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={openForm.data.profit_rate}
                                onChange={(e) => openForm.setData('profit_rate', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Opening Date</label>
                            <input
                                type="date"
                                value={openForm.data.opened_date}
                                onChange={(e) => openForm.setData('opened_date', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button type="submit" disabled={openForm.processing} className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white">
                                Open Savings Account
                            </button>
                        </div>
                    </form>
                )}

                {tab === 'transactions' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500">
                                    <th className="py-2">তারিখ</th>
                                    <th className="py-2">অ্যাকাউন্ট</th>
                                    <th className="py-2">ধরন</th>
                                    <th className="py-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="border-b border-slate-50">
                                        <td className="py-2 font-semibold">{formatDate(tx.business_date)}</td>
                                        <td className="py-2 font-bold">{tx.savings_account?.account_no}</td>
                                        <td className="py-2 uppercase">{tx.kind}</td>
                                        <td className="py-2 font-bold">{fmt(tx.amount_paisa)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
