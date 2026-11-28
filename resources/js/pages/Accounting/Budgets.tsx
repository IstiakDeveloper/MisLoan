import { Head, router, useForm } from '@inertiajs/react';
import { Coins, Save, Trash2 } from 'lucide-react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';

interface LedgerAccount {
    id: number;
    code: string;
    name: string;
    type: string;
}

interface BudgetRow {
    id: number;
    ledger_account_id: number;
    period_month: string;
    budget_paisa: number;
    note?: string | null;
    ledger_account?: LedgerAccount | null;
    financial_year?: { id: number; name: string } | null;
}

interface Props {
    branch: { id: number; name: string; code: string } | null;
    periodMonth: string;
    budgets: BudgetRow[];
    actuals: Record<number, { debit_paisa: number; credit_paisa: number }>;
    accounts: LedgerAccount[];
    financialYears: Array<{ id: number; name: string; status: string }>;
    canManage: boolean;
}

const fmt = (paisa: number) => `৳${(Number(paisa || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function Budgets({ branch, periodMonth, budgets, actuals, accounts, financialYears, canManage }: Props) {
    const form = useForm({
        branch_id: branch?.id ?? '',
        financial_year_id: financialYears[0]?.id ?? '',
        ledger_account_id: '',
        period_month: periodMonth,
        budget_amount: '',
        note: '',
    });

    return (
        <AdminLayout>
            <Head title="Account Budgets" />
            <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div>
                        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <Coins className="h-5 w-5 text-brand" />
                            Branch Budget Management
                        </h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {branch ? `শাখা: ${branch.code} — ${branch.name}` : 'শাখা নির্ধারিত নেই'} • মাস: {periodMonth}
                        </p>
                    </div>
                    <div>
                        <input
                            type="month"
                            value={periodMonth}
                            onChange={(e) => router.get('/accounting/budgets', { period_month: e.target.value }, { preserveState: false })}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                        />
                    </div>
                </div>

                {canManage && branch && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/accounting/budgets', {
                                onSuccess: () => form.reset('ledger_account_id', 'budget_amount', 'note'),
                            });
                        }}
                        className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:grid-cols-4"
                    >
                        <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Ledger Account</label>
                            <ComboSelect
                                size="sm"
                                value={form.data.ledger_account_id ? Number(form.data.ledger_account_id) : null}
                                onChange={(val) => form.setData('ledger_account_id', val ? String(val) : '')}
                                items={accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name} (${a.type})` }))}
                                placeholder="লেজার নির্বাচন করুন"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Budget Amount (৳)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.data.budget_amount}
                                onChange={(e) => form.setData('budget_amount', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <button
                                type="submit"
                                disabled={form.processing || !form.data.ledger_account_id}
                                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Save Budget
                            </button>
                        </div>
                    </form>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-500">
                                <th className="py-2">Account</th>
                                <th className="py-2 text-right">Budget</th>
                                <th className="py-2 text-right">Actual (Journal)</th>
                                <th className="py-2 text-right">Variance</th>
                                {canManage && <th className="py-2 text-right">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {budgets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-slate-400">
                                        এই মাসের জন্য কোনো বাজেট সেট করা নেই।
                                    </td>
                                </tr>
                            ) : (
                                budgets.map((b) => {
                                    const act = actuals[b.ledger_account_id];
                                    const isIncomeOrLiab = b.ledger_account?.type === 'income' || b.ledger_account?.type === 'liability';
                                    const actualPaisa = act ? (isIncomeOrLiab ? act.credit_paisa - act.debit_paisa : act.debit_paisa - act.credit_paisa) : 0;
                                    const variance = b.budget_paisa - actualPaisa;
                                    return (
                                        <tr key={b.id} className="border-b border-slate-50">
                                            <td className="py-2.5 font-semibold">
                                                {b.ledger_account ? `${b.ledger_account.code} — ${b.ledger_account.name}` : `#${b.ledger_account_id}`}
                                            </td>
                                            <td className="py-2.5 text-right font-bold">{fmt(b.budget_paisa)}</td>
                                            <td className="py-2.5 text-right">{fmt(actualPaisa)}</td>
                                            <td className={`py-2.5 text-right font-bold ${variance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                {fmt(variance)}
                                            </td>
                                            {canManage && (
                                                <td className="py-2.5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => router.delete(`/accounting/budgets/${b.id}`)}
                                                        className="rounded p-1 text-rose-500 hover:bg-rose-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
