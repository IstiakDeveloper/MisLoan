import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

type Row = {
    id: number;
    code: string;
    name: string;
    type: string;
    is_active: boolean;
    opening_paisa: string;
    debit_paisa: string;
    credit_paisa: string;
    closing_paisa: string;
    normal_balance_paisa: string;
    period_normal_paisa: string;
};
type Entry = {
    id: number;
    journal_id: number;
    reference: string;
    business_date: string;
    branch_code: string;
    description: string;
    source_type: string;
    reversal_of: number | null;
    debit_paisa: string;
    credit_paisa: string;
    running_paisa: string;
};
type Props = {
    rows: Row[];
    totals: Record<string, string>;
    from: string;
    to: string;
    branchId: number | null;
    accountId: number | null;
    branches: { id: number; code: string; name: string }[];
    accounts: { id: number; code: string; name: string }[];
    ledger: {
        opening_paisa: string;
        entries: {
            data: Entry[];
            prev_page_url: string | null;
            next_page_url: string | null;
        };
    } | null;
};
const money = (v: string) => {
    const n = BigInt(v);
    const a = n < 0n ? -n : n;
    return `${n < 0n ? '-' : ''}${a / 100n}.${String(a % 100n).padStart(2, '0')}`;
};
const side = (v: string) =>
    `${money(v)}${BigInt(v) > 0n ? ' Dr' : BigInt(v) < 0n ? ' Cr (signed)' : ''}`;
const cell = 'p-2 text-left align-top';
export default function FinancialReports({
    rows,
    totals,
    from,
    to,
    branchId,
    accountId,
    branches,
    accounts,
    ledger,
}: Props) {
    const [start, setStart] = useState(from);
    const [end, setEnd] = useState(to);
    const [branch, setBranch] = useState(branchId?.toString() ?? '');
    const [account, setAccount] = useState(accountId?.toString() ?? '');
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const current = new URLSearchParams({
        from,
        to,
        ...(branchId ? { branch_id: String(branchId) } : {}),
        ...(accountId ? { account_id: String(accountId) } : {}),
    });
    const exportUrl = (kind: string) =>
        `/accounting/reports?${current.toString()}&download=${kind}`;
    const statement = (type: string) => (
        <table className="w-full">
            <tbody>
                {rows
                    .filter((r) => r.type === type)
                    .map((r) => (
                        <tr className="border-t" key={r.id}>
                            <td className={cell}>
                                {r.code} {r.name}
                            </td>
                            <td className={cell}>
                                {money(
                                    ['income', 'expense'].includes(type)
                                        ? r.period_normal_paisa
                                        : r.normal_balance_paisa,
                                )}
                            </td>
                        </tr>
                    ))}
            </tbody>
        </table>
    );
    return (
        <AdminLayout>
            <Head title="Financial reports" />
            <div className="space-y-5 p-4 text-slate-900">
                <h1 className="text-2xl font-semibold">
                    আর্থিক প্রতিবেদন ও account ledger
                </h1>
                <p className="rounded border border-amber-300 bg-amber-50 p-4">
                    শুধু posted GL-এর রিপোর্ট। সব opening balance ও ঋণ–সঞ্চয়সহ
                    লেনদেনের integration সম্পূর্ণ যাচাই না হওয়া পর্যন্ত এটি
                    প্রতিষ্ঠানের পূর্ণ আর্থিক অবস্থান নয়। অনাদায়ী contractual
                    loan charge GL income হিসেবে ধরা হয়নি; আদায়ের সময় income
                    হয়েছে। এই live report audited বা নিয়ন্ত্রক সংস্থার অনুমোদিত
                    বিবরণী নয়।
                </p>
                <form
                    className="flex flex-wrap items-end gap-3 rounded border bg-white p-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get('/accounting/reports', {
                            from: start,
                            to: end,
                            ...(branch ? { branch_id: branch } : {}),
                            ...(account ? { account_id: account } : {}),
                        });
                    }}
                >
                    <label>
                        শুরুর তারিখ
                        <input
                            required
                            className="block rounded border p-2"
                            type="date"
                            value={start}
                            onChange={(e) => setStart(e.target.value)}
                        />
                    </label>
                    <label>
                        শেষ তারিখ
                        <input
                            required
                            className="block rounded border p-2"
                            type="date"
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                        />
                    </label>
                    <label>
                        শাখা
                        <select
                            aria-label="শাখা"
                            className="block rounded border p-2"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                        >
                            <option value="">সব শাখা</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.code} {b.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Ledger account
                        <select
                            aria-label="Ledger account"
                            className="block rounded border p-2"
                            value={account}
                            onChange={(e) => setAccount(e.target.value)}
                        >
                            <option value="">Account নির্বাচন করুন</option>
                            {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.code} {a.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button className="rounded bg-emerald-700 px-4 py-2 text-white">
                        রিপোর্ট দেখুন
                    </button>
                </form>
                <div role="alert" className="text-red-700">
                    {Object.entries(errors).map(([k, v]) => (
                        <p key={k}>{v}</p>
                    ))}
                </div>
                <div className="flex gap-4">
                    <a
                        className="text-emerald-800 underline"
                        href={exportUrl('balances')}
                    >
                        Trial balance CSV
                    </a>
                    {accountId && (
                        <a
                            className="text-emerald-800 underline"
                            href={exportUrl('ledger')}
                        >
                            Account ledger CSV
                        </a>
                    )}
                </div>
                <section className="overflow-auto rounded border bg-white p-4">
                    <h2 className="text-xl font-semibold">
                        Trial balance — {from} থেকে {to}
                    </h2>
                    <p>
                        Opening/closing-এ debit ধনাত্মক, credit ঋণাত্মক। Period
                        debit/credit আলাদা gross movement।
                    </p>
                    <table className="w-full">
                        <thead>
                            <tr>
                                {[
                                    'Account',
                                    'Type',
                                    'Opening',
                                    'Period debit',
                                    'Period credit',
                                    'Closing',
                                ].map((h) => (
                                    <th className={cell} key={h}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr className="border-t" key={r.id}>
                                    <td className={cell}>
                                        {r.code} {r.name}
                                        {!r.is_active ? ' (inactive)' : ''}
                                    </td>
                                    <td className={cell}>{r.type}</td>
                                    <td className={cell}>
                                        {side(r.opening_paisa)}
                                    </td>
                                    <td className={cell}>
                                        {money(r.debit_paisa)}
                                    </td>
                                    <td className={cell}>
                                        {money(r.credit_paisa)}
                                    </td>
                                    <td className={cell}>
                                        {side(r.closing_paisa)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p>
                        Closing debit: {money(totals.closing_debit_paisa)} ·
                        Closing credit: {money(totals.closing_credit_paisa)} ·
                        Difference: {money(totals.trial_difference_paisa)}
                    </p>
                </section>
                <section className="rounded border bg-white p-4">
                    <h2 className="text-xl font-semibold">
                        আয়–ব্যয় — {from} থেকে {to}
                    </h2>
                    <p>
                        Income: ৳{money(totals.period_income_paisa)} · Expense:
                        ৳{money(totals.period_expense_paisa)} · Surplus /
                        deficit: ৳{money(totals.period_surplus_paisa)}
                    </p>
                    <p>
                        আয়–ব্যয়ের account breakdown শুধু নির্বাচিত তারিখের
                        movement।
                    </p>
                    <h3>Income accounts (period)</h3>
                    {statement('income')}
                    <h3>Expense accounts (period)</h3>
                    {statement('expense')}
                </section>
                <section className="rounded border bg-white p-4">
                    <h2 className="text-xl font-semibold">
                        Balance sheet — {to}
                    </h2>
                    <h3>Assets: ৳{money(totals.asset_paisa)}</h3>
                    {statement('asset')}
                    <h3>Liabilities: ৳{money(totals.liability_paisa)}</h3>
                    {statement('liability')}
                    <h3>Equity accounts: ৳{money(totals.equity_paisa)}</h3>
                    {statement('equity')}
                    <p>
                        Cumulative income less expenses: ৳
                        {money(totals.cumulative_surplus_paisa)}। Equity-তে
                        journal করা retained results আবার এখানে যোগ হয় না।
                    </p>
                    <p>
                        Assets − liabilities − equity − cumulative surplus: ৳
                        {money(totals.balance_sheet_difference_paisa)}
                    </p>
                </section>
                {ledger && (
                    <section className="overflow-auto rounded border bg-white p-4">
                        <h2 className="text-xl font-semibold">
                            Account ledger
                        </h2>
                        <p>
                            Opening: {side(ledger.opening_paisa)}। Running
                            balance আগের পাতার লেনদেনসহ গণনা করা হয়েছে।
                        </p>
                        <table className="w-full">
                            <thead>
                                <tr>
                                    {[
                                        'Date / branch',
                                        'Journal / source',
                                        'Description',
                                        'Debit',
                                        'Credit',
                                        'Running',
                                    ].map((h) => (
                                        <th className={cell} key={h}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.entries.data.map((e) => (
                                    <tr className="border-t" key={e.id}>
                                        <td className={cell}>
                                            {e.business_date} / {e.branch_code}
                                        </td>
                                        <td className={cell}>
                                            #{e.journal_id} · {e.reference} ·{' '}
                                            {e.source_type}
                                            {e.reversal_of
                                                ? ` · reversal of #${e.reversal_of}`
                                                : ''}
                                        </td>
                                        <td className={cell}>
                                            {e.description}
                                        </td>
                                        <td className={cell}>
                                            {money(e.debit_paisa)}
                                        </td>
                                        <td className={cell}>
                                            {money(e.credit_paisa)}
                                        </td>
                                        <td className={cell}>
                                            {side(e.running_paisa)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="flex gap-4">
                            {ledger.entries.prev_page_url && (
                                <Link href={ledger.entries.prev_page_url}>
                                    আগের পাতা
                                </Link>
                            )}
                            {ledger.entries.next_page_url && (
                                <Link href={ledger.entries.next_page_url}>
                                    পরের পাতা
                                </Link>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </AdminLayout>
    );
}
