import AdminLayout from '@/layouts/admin-layout';
import { Head, useForm } from '@inertiajs/react';

type Account = { id: number; code: string; name: string };
type Product = { id: number; product_code: string; product_name: string };
type Policy = {
    partial_priority: string | null;
    write_off_expense_account_id: number | null;
    reschedule_enabled: boolean | number;
};
type Version = { id: number; product_type: string; product_id: number; effective_on: string };
type Props = {
    policy: Policy;
    versions: Version[];
    accounts: Account[];
    loanProducts: Product[];
    savingsProducts: Product[];
};

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export default function InstitutionPolicy({ policy, versions, accounts, loanProducts, savingsProducts }: Props) {
    const form = useForm({
        partial_priority: policy.partial_priority ?? '',
        write_off_expense_account_id: policy.write_off_expense_account_id ?? '',
        reschedule_enabled: Boolean(policy.reschedule_enabled),
    });
    const snapshot = useForm({ product_type: 'loan', product_id: '', effective_on: '' });
    const products = snapshot.data.product_type === 'loan' ? loanProducts : savingsProducts;

    return (
        <AdminLayout>
            <Head title="প্রতিষ্ঠানের নীতি" />
            <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 text-slate-900 dark:text-slate-100">
                <header>
                    <p className="text-sm text-emerald-700">হিসাব সেটআপ</p>
                    <h1 className="text-2xl font-semibold">নীতি ও প্রোডাক্ট ভার্সন</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-300">রিবেট ও সঞ্চয়ের মুনাফা প্রোডাক্টের নিজের হার থেকে হয়। আসল, সার্ভিস চার্জ এবং প্রতিটি মুনাফার খরচ আলাদা লেজারে GL ডিফল্ট থেকে বসে। খালি ঘর কিছু পোস্ট করে না।</p>
                </header>
                <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); form.post('/accounting/institution-policy'); }}>
                    <select className={field} value={form.data.partial_priority} onChange={(event) => form.setData('partial_priority', event.target.value)}>
                        <option value="">আংশিক আদায়ের ভাগ বন্ধ</option>
                        <option value="principal_first">আগে আসল</option>
                        <option value="charge_first">আগে সার্ভিস চার্জ</option>
                    </select>
                    <select className={field} value={form.data.write_off_expense_account_id} onChange={(event) => form.setData('write_off_expense_account_id', event.target.value)}>
                        <option value="">রাইট-অফের খরচ হিসাব নেই</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.data.reschedule_enabled} onChange={(event) => form.setData('reschedule_enabled', event.target.checked)} />
                        রিশিডিউল অনুরোধ চালু
                    </label>
                    <button className="rounded-lg bg-emerald-700 px-4 py-2 text-white" disabled={form.processing}>নীতি সেভ</button>
                </form>
                <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); snapshot.post('/accounting/product-policies'); }}>
                    <select className={field} value={snapshot.data.product_type} onChange={(event) => snapshot.setData('product_type', event.target.value)}>
                        <option value="loan">ঋণ</option>
                        <option value="savings">সঞ্চয়</option>
                    </select>
                    <select className={field} value={snapshot.data.product_id} onChange={(event) => snapshot.setData('product_id', event.target.value)}>
                        <option value="">প্রোডাক্ট</option>
                        {products.map((product) => <option key={product.id} value={product.id}>{product.product_code} — {product.product_name}</option>)}
                    </select>
                    <input className={field} type="date" value={snapshot.data.effective_on} onChange={(event) => snapshot.setData('effective_on', event.target.value)} />
                    <button className="rounded-lg bg-slate-800 px-4 py-2 text-white md:col-span-3" disabled={snapshot.processing}>বর্তমান রেট ভার্সন হিসেবে সেভ</button>
                </form>
                <ul className="text-sm">
                    {versions.map((version) => <li key={version.id}>{version.effective_on} · {version.product_type} #{version.product_id}</li>)}
                </ul>
            </div>
        </AdminLayout>
    );
}
