import AdminLayout from '@/layouts/admin-layout';
import { Head, router, useForm } from '@inertiajs/react';

type Account = { id: number; code: string; name: string };
type Mapping = {
    id: number;
    framework: string;
    line_code: string;
    line_name: string;
    account_code: string | null;
    balance_paisa: number;
};
type Props = { asOf: string; mappings: Mapping[]; accounts: Account[] };

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const money = (paisa: number) => {
    const absolute = BigInt(paisa < 0 ? -paisa : paisa);
    return `${paisa < 0 ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};

export default function RegulatoryMappings({ asOf, mappings, accounts }: Props) {
    const form = useForm({ framework: 'mra', line_code: '', line_name: '', ledger_account_id: '' });

    return (
        <AdminLayout>
            <Head title="নিয়ন্ত্রক ম্যাপিং" />
            <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 text-slate-900 dark:text-slate-100">
                <header>
                    <p className="text-sm text-emerald-700">প্রতিবেদন</p>
                    <h1 className="text-2xl font-semibold">MRA ও PKSF লাইন</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-300">যে লাইনে হিসাব বসানো নেই, তার ব্যালেন্স শূন্য দেখায়। এটি সই করা রিটার্ন নয়। তারিখ {asOf}।</p>
                </header>
                <input className={field} type="date" value={asOf} onChange={(event) => router.get('/accounting/regulatory-mappings', { as_of: event.target.value })} />
                <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); form.post('/accounting/regulatory-mappings'); }}>
                    <select className={field} value={form.data.framework} onChange={(event) => form.setData('framework', event.target.value)}>
                        <option value="mra">MRA</option>
                        <option value="pksf">PKSF</option>
                    </select>
                    <input className={field} placeholder="লাইন কোড" value={form.data.line_code} onChange={(event) => form.setData('line_code', event.target.value)} />
                    <input className={field} placeholder="লাইনের নাম" value={form.data.line_name} onChange={(event) => form.setData('line_name', event.target.value)} />
                    <select className={field} value={form.data.ledger_account_id} onChange={(event) => form.setData('ledger_account_id', event.target.value)}>
                        <option value="">GL হিসাব পরে</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}
                    </select>
                    <button className="rounded-lg bg-emerald-700 px-4 py-2 text-white md:col-span-2" disabled={form.processing}>ম্যাপিং সেভ</button>
                </form>
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b"><th>ফ্রেমওয়ার্ক</th><th>কোড</th><th>নাম</th><th>GL</th><th>ব্যালেন্স</th></tr></thead>
                    <tbody>
                        {mappings.map((mapping) => (
                            <tr key={mapping.id} className="border-b">
                                <td>{mapping.framework}</td>
                                <td>{mapping.line_code}</td>
                                <td>{mapping.line_name}</td>
                                <td>{mapping.account_code ?? '—'}</td>
                                <td>{money(mapping.balance_paisa)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
