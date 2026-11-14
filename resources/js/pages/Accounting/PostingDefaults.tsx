import AdminLayout from '@/layouts/admin-layout';
import { Head, useForm } from '@inertiajs/react';

type Account = { id: number; code: string; name: string; type: string };
type Row = {
    id: number;
    branch_name: string | null;
    loan_product_name: string | null;
    savings_product_name: string | null;
    loan_principal_account_id: number | null;
    loan_charge_income_account_id: number | null;
    loan_cash_account_id: number | null;
    loan_rebate_expense_account_id: number | null;
    savings_liability_account_id: number | null;
    savings_cash_account_id: number | null;
    savings_profit_expense_account_id: number | null;
};
type Option = { id: number; name?: string; product_name?: string; code?: string; product_code?: string };
type Props = {
    defaults: Row[];
    branches: Option[];
    loanProducts: Option[];
    savingsProducts: Option[];
    accounts: Account[];
};

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export default function PostingDefaults({ defaults, branches, loanProducts, savingsProducts, accounts }: Props) {
    const form = useForm({
        branch_id: '',
        loan_product_id: '',
        savings_product_id: '',
        loan_principal_account_id: '',
        loan_charge_income_account_id: '',
        loan_cash_account_id: '',
        loan_rebate_expense_account_id: '',
        savings_liability_account_id: '',
        savings_cash_account_id: '',
        savings_profit_expense_account_id: '',
    });
    const label = (id: number | null) => accounts.find((account) => account.id === id)?.code ?? '—';

    return (
        <AdminLayout>
            <Head title="GL ডিফল্ট" />
            <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 text-slate-900 dark:text-slate-100">
                <header>
                    <p className="text-sm text-emerald-700">হিসাব সেটআপ</p>
                    <h1 className="text-2xl font-semibold">প্রোডাক্ট ও শাখার GL ডিফল্ট</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-300">খালি সেটিং হিসাব বানিয়ে দেয় না। পুরোনো সই করা চুক্তি বদলায় না।</p>
                </header>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); form.post('/accounting/posting-defaults'); }}>
                    <select className={field} value={form.data.branch_id} onChange={(event) => form.setData('branch_id', event.target.value)}>
                        <option value="">সব শাখা</option>
                        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} — {branch.name}</option>)}
                    </select>
                    <select className={field} value={form.data.loan_product_id} onChange={(event) => form.setData('loan_product_id', event.target.value)}>
                        <option value="">সব ঋণ প্রোডাক্ট</option>
                        {loanProducts.map((product) => <option key={product.id} value={product.id}>{product.product_code} — {product.product_name}</option>)}
                    </select>
                    <select className={field} value={form.data.savings_product_id} onChange={(event) => form.setData('savings_product_id', event.target.value)}>
                        <option value="">সব সঞ্চয় প্রোডাক্ট</option>
                        {savingsProducts.map((product) => <option key={product.id} value={product.id}>{product.product_code} — {product.product_name}</option>)}
                    </select>
                    {([
                        ['loan_principal_account_id', 'ঋণের আসল', 'asset'],
                        ['loan_charge_income_account_id', 'সার্ভিস চার্জ আয়', 'income'],
                        ['loan_cash_account_id', 'ঋণের নগদ', 'asset'],
                        ['loan_rebate_expense_account_id', 'ঋণ রিবেট খরচ', 'expense'],
                        ['savings_liability_account_id', 'সঞ্চয়ের দায়', 'liability'],
                        ['savings_cash_account_id', 'সঞ্চয়ের নগদ', 'asset'],
                        ['savings_profit_expense_account_id', 'সঞ্চয় মুনাফা খরচ', 'expense'],
                    ] as const).map(([key, title, type]) => (
                        <select key={key} className={field} value={form.data[key]} onChange={(event) => form.setData(key, event.target.value)}>
                            <option value="">{title}</option>
                            {accounts.filter((account) => account.type === type).map((account) => (
                                <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
                            ))}
                        </select>
                    ))}
                    <button className="rounded-lg bg-emerald-700 px-4 py-2 text-white md:col-span-2" disabled={form.processing}>সেভ</button>
                </form>
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="py-2">আওতা</th>
                            <th>আসল</th>
                            <th>সার্ভিস চার্জ</th>
                            <th>নগদ</th>
                            <th>রিবেট</th>
                            <th>সঞ্চয় দায়</th>
                            <th>সঞ্চয় নগদ</th>
                            <th>মুনাফা</th>
                        </tr>
                    </thead>
                    <tbody>
                        {defaults.map((row) => (
                            <tr key={row.id} className="border-b">
                                <td className="py-2">{row.branch_name ?? 'প্রতিষ্ঠান'} {row.loan_product_name ?? row.savings_product_name ?? ''}</td>
                                <td>{label(row.loan_principal_account_id)}</td>
                                <td>{label(row.loan_charge_income_account_id)}</td>
                                <td>{label(row.loan_cash_account_id)}</td>
                                <td>{label(row.loan_rebate_expense_account_id)}</td>
                                <td>{label(row.savings_liability_account_id)}</td>
                                <td>{label(row.savings_cash_account_id)}</td>
                                <td>{label(row.savings_profit_expense_account_id)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
