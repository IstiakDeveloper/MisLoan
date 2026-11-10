import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

type Amounts = {
    principal_paisa: string;
    charge_paisa: string;
    overdue_paisa: string;
    par30_paisa: string;
    par90_paisa: string;
    aged_1_30_paisa: string;
    aged_31_60_paisa: string;
    aged_61_90_paisa: string;
    aged_91_plus_paisa: string;
    account_count: number;
    outstanding_count: number;
};
type Props = {
    totals: Amounts;
    branches: (Amounts & {
        branch_id: number;
        branch_name: string;
        branch_code: string;
    })[];
    branchesList: { id: number; code: string; name: string }[];
    asOf: string;
    branchId: number | null;
    unlinkedDisbursedCount: number;
    notYetOpenedCount: number;
    accounts: {
        data: {
            id: number;
            application_no: string;
            branch_name: string;
            principal_paisa: string;
            charge_paisa: string;
            overdue_paisa: string;
            oldest_unpaid_on: string | null;
            days_past_due: number;
        }[];
        prev_page_url: string | null;
        next_page_url: string | null;
        total: number;
    };
};
const money = (value: string) => {
    const n = BigInt(value);
    const a = n < 0n ? -n : n;
    return `${n < 0n ? '-' : ''}${a / 100n}.${String(a % 100n).padStart(2, '0')}`;
};
const percent = (value: string, base: string) => {
    const denominator = BigInt(base);
    if (denominator === 0n) return '—';
    const p = (BigInt(value) * 10000n) / denominator;
    return `${p / 100n}.${String(p % 100n).padStart(2, '0')}%`;
};
export default function LoanPortfolio({
    totals,
    branches,
    branchesList,
    asOf,
    branchId,
    unlinkedDisbursedCount,
    notYetOpenedCount,
    accounts,
}: Props) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [date, setDate] = useState(asOf);
    const [branch, setBranch] = useState(branchId?.toString() ?? '');
    return (
        <AdminLayout>
            <Head title="Loan portfolio" />
            <div className="space-y-5 p-4 text-slate-900">
                <h1 className="text-2xl font-semibold">
                    ঋণ পোর্টফোলিও ও বকেয়া
                </h1>
                <form
                    className="flex flex-wrap items-end gap-3 rounded border bg-white p-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get('/loan-portfolio', {
                            as_of: date,
                            ...(branch ? { branch_id: branch } : {}),
                        });
                    }}
                >
                    <label>
                        হিসাবের তারিখ
                        <input
                            required
                            type="date"
                            className="block rounded border p-2"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </label>
                    <label>
                        শাখা
                        <select
                            className="block rounded border p-2"
                            aria-label="শাখা"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                        >
                            <option value="">সব শাখা</option>
                            {branchesList.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.code} — {b.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button className="rounded bg-emerald-700 px-4 py-2 text-white">
                        রিপোর্ট দেখুন
                    </button>
                </form>
                <div role="alert" className="text-red-700">
                    {Object.entries(errors).map(([key, message]) => (
                        <p key={key}>{message}</p>
                    ))}
                </div>
                <div className="rounded border border-amber-300 bg-amber-50 p-4">
                    <p>
                        এই রিপোর্ট শুধু যাচাইকৃত loan ledger-এর হিসাব দেখায়।
                        বর্তমানে ledger ছাড়া বিতরণকৃত আবেদন:{' '}
                        <strong>{unlinkedDisbursedCount}</strong>। নির্বাচিত
                        তারিখের পরে খোলা ledger:{' '}
                        <strong>{notYetOpenedCount}</strong> (রিপোর্টের বাইরে)।
                        পুরোনো opening-এর আগের হিসাব এখানে পুনর্গঠন করা হয় না।
                    </p>
                </div>
                <section className="grid gap-3 md:grid-cols-3">
                    {[
                        ['আসল স্থিতি', `৳${money(totals.principal_paisa)}`],
                        [
                            'আদায়যোগ্য service charge',
                            `৳${money(totals.charge_paisa)}`,
                        ],
                        [
                            'বকেয়া কিস্তি (আসল ও charge)',
                            `৳${money(totals.overdue_paisa)}`,
                        ],
                        [
                            'PAR >30 দিন',
                            percent(totals.par30_paisa, totals.principal_paisa),
                        ],
                        [
                            'PAR >90 দিন',
                            percent(totals.par90_paisa, totals.principal_paisa),
                        ],
                        [
                            'বকেয়া স্থিতি আছে এমন হিসাব',
                            `${totals.outstanding_count} / ${totals.account_count}`,
                        ],
                    ].map(([label, value]) => (
                        <div
                            key={label}
                            className="rounded border bg-white p-4"
                        >
                            <p>{label}</p>
                            <p className="text-2xl font-semibold">{value}</p>
                        </div>
                    ))}
                </section>
                <p>
                    কিস্তির মোট আদায় আগে প্রাপ্য কিস্তির সঙ্গে সমন্বয় হয়।
                    নির্ধারিত তারিখের পরের দিন থেকে বকেয়ার বয়স গণনা হয়। PAR-এ
                    সংশ্লিষ্ট ঋণের সম্পূর্ণ বকেয়া আসল / সব ledger-এর বকেয়া আসল
                    ব্যবহার করা হয়েছে; শুধু মেয়াদোত্তীর্ণ কিস্তির অঙ্ক নয়।
                    স্থিতি শূন্য হলে অনুপাত প্রযোজ্য নয়। এগুলো কার্যক্রম
                    পর্যবেক্ষণের সূচক; অনুমোদিত MRA/PKSF provision
                    classification নয়।
                </p>
                <section className="overflow-auto rounded border bg-white p-4">
                    <h2 className="text-xl font-semibold">
                        শাখাভিত্তিক স্থিতি — {asOf}
                    </h2>
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                {[
                                    'শাখা',
                                    'আসল',
                                    'Charge',
                                    'বকেয়া কিস্তি',
                                    'PAR >30',
                                    'PAR >90',
                                    '১–৩০ দিনের ঝুঁকির আসল',
                                    '৩১–৬০',
                                    '৬১–৯০',
                                    '৯১+',
                                ].map((h) => (
                                    <th className="p-2" key={h}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {branches.map((b) => (
                                <tr key={b.branch_id} className="border-t">
                                    <td className="p-2">
                                        {b.branch_code} {b.branch_name}
                                    </td>
                                    {[
                                        b.principal_paisa,
                                        b.charge_paisa,
                                        b.overdue_paisa,
                                    ].map((v, i) => (
                                        <td className="p-2" key={i}>
                                            {money(v)}
                                        </td>
                                    ))}
                                    <td className="p-2">
                                        {percent(
                                            b.par30_paisa,
                                            b.principal_paisa,
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {percent(
                                            b.par90_paisa,
                                            b.principal_paisa,
                                        )}
                                    </td>
                                    {[
                                        b.aged_1_30_paisa,
                                        b.aged_31_60_paisa,
                                        b.aged_61_90_paisa,
                                        b.aged_91_plus_paisa,
                                    ].map((v, i) => (
                                        <td className="p-2" key={i}>
                                            {money(v)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!branches.length && (
                        <p>নির্বাচিত তারিখে কোনো ledger নেই।</p>
                    )}
                </section>
                <section className="overflow-auto rounded border bg-white p-4">
                    <h2 className="text-xl font-semibold">
                        ঋণের বিস্তারিত ({accounts.total})
                    </h2>
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                {[
                                    'ঋণ',
                                    'শাখা',
                                    'আসল',
                                    'Charge',
                                    'বকেয়া কিস্তি',
                                    'প্রথম অপরিশোধিত প্রাপ্য তারিখ',
                                    'বকেয়ার দিন',
                                ].map((h) => (
                                    <th className="p-2" key={h}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.data.map((a) => (
                                <tr key={a.id} className="border-t">
                                    <td className="p-2">
                                        <Link
                                            className="text-emerald-800 underline"
                                            href={`/loan-ledger?account_id=${a.id}&as_of=${asOf}`}
                                        >
                                            {a.application_no}
                                        </Link>
                                    </td>
                                    <td className="p-2">{a.branch_name}</td>
                                    {[
                                        a.principal_paisa,
                                        a.charge_paisa,
                                        a.overdue_paisa,
                                    ].map((v, i) => (
                                        <td className="p-2" key={i}>
                                            {money(v)}
                                        </td>
                                    ))}
                                    <td className="p-2">
                                        {a.oldest_unpaid_on ?? '—'}
                                    </td>
                                    <td className="p-2">{a.days_past_due}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex gap-4">
                        {accounts.prev_page_url && (
                            <Link href={accounts.prev_page_url}>আগের পাতা</Link>
                        )}
                        {accounts.next_page_url && (
                            <Link href={accounts.next_page_url}>পরের পাতা</Link>
                        )}
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
