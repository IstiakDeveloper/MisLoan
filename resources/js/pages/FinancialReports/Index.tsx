import { Head, router } from '@inertiajs/react';
import { BarChart3, PieChart, Scale, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface TbRow {
    id: number;
    code: string;
    name: string;
    type: string;
    debit_paisa: number;
    credit_paisa: number;
    net_paisa: number;
}

interface StatementItem {
    id: number;
    code: string;
    name: string;
    balance_paisa: number;
}

interface Props {
    branchId: number | null;
    branches: Branch[];
    canSelectBranch: boolean;
    filters: { from_date: string; to_date: string };
    trialBalance: TbRow[];
    statements: {
        assets: StatementItem[];
        liabilities: StatementItem[];
        equity: StatementItem[];
        income: StatementItem[];
        expense: StatementItem[];
        totals: {
            assets_paisa: number;
            liabilities_paisa: number;
            equity_paisa: number;
            income_paisa: number;
            expense_paisa: number;
            net_surplus_paisa: number;
            liabilities_plus_equity_paisa: number;
        };
    };
    portfolio: {
        pomis: {
            approved_members: number;
            active_borrowers: number;
            total_loan_outstanding_paisa: number;
            total_savings_balance_paisa: number;
        };
        par_buckets: Record<string, { count: number; outstanding_paisa: number }>;
    };
}

const fmt = (paisa: number): string =>
    `৳${(paisa / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinancialReportsIndex({
    branchId,
    branches,
    canSelectBranch,
    filters,
    trialBalance,
    statements,
    portfolio,
}: Props) {
    const [tab, setTab] = useState<'tb' | 'bs' | 'pomis'>('tb');
    const [fromDate, setFromDate] = useState(filters.from_date);
    const [toDate, setToDate] = useState(filters.to_date);
    const [selectedBranch, setSelectedBranch] = useState<number | null>(branchId);

    const applyFilters = (nextBranch = selectedBranch) => {
        router.get(
            '/financial-reports',
            { branch_id: nextBranch || undefined, from_date: fromDate, to_date: toDate },
            { preserveState: true },
        );
    };

    const totalDebit = trialBalance.reduce((s, r) => s + r.debit_paisa, 0);
    const totalCredit = trialBalance.reduce((s, r) => s + r.credit_paisa, 0);

    return (
        <AdminLayout>
            <Head title="Financial & MRA/PKSF Reports" />

            <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Financial Statements & MRA / PKSF (POMIS) Reports</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            সময়কাল: {formatDate(filters.from_date)} থেকে {formatDate(filters.to_date)}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        {canSelectBranch && (
                            <div className="w-52">
                                <ComboSelect
                                    size="sm"
                                    value={selectedBranch}
                                    onChange={(val) => {
                                        setSelectedBranch(val);
                                        applyFilters(val);
                                    }}
                                    items={branches.map((b) => ({
                                        value: b.id,
                                        label: `${b.name} (${b.code})`,
                                    }))}
                                    placeholder="All Branches (Consolidated)"
                                />
                            </div>
                        )}
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                        />
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                        />
                        <button
                            type="button"
                            onClick={() => applyFilters()}
                            className="rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-white"
                        >
                            Apply
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'tb', label: 'Trial Balance', icon: Scale },
                        { id: 'bs', label: 'Income & Balance Sheet', icon: BarChart3 },
                        { id: 'pomis', label: 'POMIS & PAR Aging', icon: PieChart },
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

                {tab === 'tb' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500">
                                    <th className="py-2">Code</th>
                                    <th className="py-2">Account Name</th>
                                    <th className="py-2">Type</th>
                                    <th className="py-2 text-right">Debit</th>
                                    <th className="py-2 text-right">Credit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trialBalance.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-50">
                                        <td className="py-2 font-bold">{row.code}</td>
                                        <td className="py-2">{row.name}</td>
                                        <td className="py-2 uppercase text-slate-500">{row.type}</td>
                                        <td className="py-2 text-right">{fmt(row.debit_paisa)}</td>
                                        <td className="py-2 text-right">{fmt(row.credit_paisa)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td colSpan={3} className="py-2.5">Total</td>
                                    <td className="py-2.5 text-right">{fmt(totalDebit)}</td>
                                    <td className="py-2.5 text-right">{fmt(totalCredit)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'bs' && (
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <h2 className="mb-3 text-sm font-bold text-slate-900">Income & Expenditure (As of {formatDate(filters.to_date)})</h2>
                            <div className="space-y-1 text-xs">
                                <div className="font-bold text-emerald-700">Income: {fmt(statements.totals.income_paisa)}</div>
                                {statements.income.map((i) => (
                                    <div key={i.id} className="flex justify-between pl-3 text-slate-600">
                                        <span>{i.code} {i.name}</span>
                                        <span>{fmt(i.balance_paisa)}</span>
                                    </div>
                                ))}
                                <div className="mt-3 font-bold text-rose-700">Expense: {fmt(statements.totals.expense_paisa)}</div>
                                {statements.expense.map((e) => (
                                    <div key={e.id} className="flex justify-between pl-3 text-slate-600">
                                        <span>{e.code} {e.name}</span>
                                        <span>{fmt(e.balance_paisa)}</span>
                                    </div>
                                ))}
                                <div className="mt-3 border-t pt-2 font-bold text-slate-900 flex justify-between">
                                    <span>Net Surplus / (Deficit)</span>
                                    <span>{fmt(statements.totals.net_surplus_paisa)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <h2 className="mb-3 text-sm font-bold text-slate-900">Balance Sheet (As of {formatDate(filters.to_date)})</h2>
                            <div className="space-y-1 text-xs">
                                <div className="font-bold text-slate-800">Assets: {fmt(statements.totals.assets_paisa)}</div>
                                {statements.assets.map((a) => (
                                    <div key={a.id} className="flex justify-between pl-3 text-slate-600">
                                        <span>{a.code} {a.name}</span>
                                        <span>{fmt(a.balance_paisa)}</span>
                                    </div>
                                ))}
                                <div className="mt-3 font-bold text-slate-800">
                                    Liabilities + Equity + Surplus: {fmt(statements.totals.liabilities_plus_equity_paisa)}
                                </div>
                                {[...statements.liabilities, ...statements.equity].map((l) => (
                                    <div key={l.id} className="flex justify-between pl-3 text-slate-600">
                                        <span>{l.code} {l.name}</span>
                                        <span>{fmt(l.balance_paisa)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'pomis' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {[
                                { label: 'Approved Members', val: portfolio.pomis.approved_members },
                                { label: 'Active Borrowers', val: portfolio.pomis.active_borrowers },
                                { label: 'Loan Principal Outstanding', val: fmt(portfolio.pomis.total_loan_outstanding_paisa) },
                                { label: 'Total Savings Balance', val: fmt(portfolio.pomis.total_savings_balance_paisa) },
                            ].map((c) => (
                                <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                    <div className="text-[11px] text-slate-500">{c.label}</div>
                                    <div className="mt-1 text-base font-bold text-slate-900">{c.val}</div>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                                <ShieldCheck className="h-4 w-4 text-brand" />
                                Portfolio at Risk (PAR Aging)
                            </div>
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-500">
                                        <th className="py-2">Aging Bucket</th>
                                        <th className="py-2">Loan Count</th>
                                        <th className="py-2 text-right">Outstanding Principal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        ['regular', 'Regular (0 days overdue)'],
                                        ['par_1_30', 'PAR 1–30 Days'],
                                        ['par_31_60', 'PAR 31–60 Days'],
                                        ['par_61_90', 'PAR 61–90 Days'],
                                        ['par_91_180', 'PAR 91–180 Days'],
                                        ['par_180_plus', 'PAR 180+ Days (Bad Loan)'],
                                    ].map(([key, label]) => {
                                        const b = portfolio.par_buckets[key] ?? { count: 0, outstanding_paisa: 0 };
                                        return (
                                            <tr key={key} className="border-b border-slate-50">
                                                <td className="py-2 font-semibold">{label}</td>
                                                <td className="py-2">{b.count}</td>
                                                <td className="py-2 text-right font-bold">{fmt(b.outstanding_paisa)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
