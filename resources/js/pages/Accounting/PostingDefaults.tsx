import { Head, useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';

interface LedgerAccount {
    id: number;
    code: string;
    name: string;
    type: string;
}

interface ProductItem {
    id: number;
    name: string;
    code?: string | null;
}

interface PostingDefaultRow {
    id: number;
    scope: string;
    product_id: number | null;
    event_key: string;
    ledger_account?: LedgerAccount | null;
    updated_by_user?: { id: number; name: string } | null;
}

interface Props {
    accounts: LedgerAccount[];
    defaults: PostingDefaultRow[];
    eventKeys: Record<string, string>;
    loanProducts: ProductItem[];
    savingsProducts: ProductItem[];
    canManage: boolean;
}

export default function PostingDefaults({
    accounts,
    defaults,
    eventKeys,
    loanProducts,
    savingsProducts,
    canManage,
}: Props) {
    const form = useForm<{
        scope: string;
        product_id: string | number;
        event_key: string;
        ledger_account_id: string | number;
    }>({
        scope: 'global',
        product_id: '',
        event_key: Object.keys(eventKeys)[0] ?? 'cash_in_hand',
        ledger_account_id: '',
    });

    const productItems =
        form.data.scope === 'loan_product'
            ? loanProducts
            : form.data.scope === 'savings_product'
              ? savingsProducts
              : [];

    return (
        <AdminLayout>
            <Head title="GL Posting Defaults" />

            <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h1 className="text-lg font-bold text-slate-900">GL Posting Defaults (Head Office Mapping)</h1>
                    <p className="mt-1 text-xs text-slate-500">
                        লোন বিতরণ, কিস্তি আদায়, সঞ্চয় জমা ও LLP-এর টাকা কোন লেজার অ্যাকাউন্টে অটোমেটিক পোস্ট হবে তা নির্ধারণ করুন।
                    </p>
                </div>

                {canManage && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/head-office/posting-defaults');
                        }}
                        className="grid items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:grid-cols-4"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Scope</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={form.data.scope}
                                onChange={(val) => {
                                    form.setData('scope', val ?? 'global');
                                    form.setData('product_id', '');
                                }}
                                items={[
                                    { value: 'global', label: 'Global Default' },
                                    { value: 'loan_product', label: 'Loan Product Override' },
                                    { value: 'savings_product', label: 'Savings Product Override' },
                                ]}
                            />
                        </div>

                        {form.data.scope !== 'global' && (
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Product</label>
                                <ComboSelect
                                    size="sm"
                                    value={form.data.product_id ? Number(form.data.product_id) : null}
                                    onChange={(val) => form.setData('product_id', val ?? '')}
                                    items={productItems.map((p) => ({
                                        value: p.id,
                                        label: p.code ? `${p.code} — ${p.name}` : p.name,
                                    }))}
                                    placeholder="প্রোডাক্ট নির্বাচন করুন"
                                />
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Accounting Event</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={form.data.event_key}
                                onChange={(val) => form.setData('event_key', val ?? 'cash_in_hand')}
                                items={Object.entries(eventKeys).map(([k, label]) => ({
                                    value: k,
                                    label,
                                }))}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Ledger Account</label>
                            <ComboSelect
                                size="sm"
                                value={form.data.ledger_account_id ? Number(form.data.ledger_account_id) : null}
                                onChange={(val) => form.setData('ledger_account_id', val ?? '')}
                                items={accounts.map((a) => ({
                                    value: a.id,
                                    label: `${a.code} — ${a.name} (${a.type})`,
                                    keywords: `${a.code} ${a.name}`,
                                }))}
                                placeholder="লেজার নির্বাচন করুন"
                            />
                        </div>

                        <div className="md:col-span-4">
                            <button
                                type="submit"
                                disabled={form.processing || !form.data.ledger_account_id}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-50"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Save Posting Default
                            </button>
                        </div>
                    </form>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-500">
                                <th className="py-2">Scope</th>
                                <th className="py-2">Event</th>
                                <th className="py-2">Mapped Ledger Account</th>
                                <th className="py-2">Updated By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {defaults.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-slate-400">
                                        এখনো কোনো ম্যাপিং সেট করা হয়নি (Accounting পেজ থেকে Seed Standard MFI COA চাপুন)
                                    </td>
                                </tr>
                            ) : (
                                defaults.map((d) => (
                                    <tr key={d.id} className="border-b border-slate-50">
                                        <td className="py-2.5 font-semibold uppercase text-slate-600">{d.scope}</td>
                                        <td className="py-2.5 text-slate-800">{eventKeys[d.event_key] ?? d.event_key}</td>
                                        <td className="py-2.5 font-bold text-slate-900">
                                            {d.ledger_account
                                                ? `${d.ledger_account.code} — ${d.ledger_account.name}`
                                                : '-'}
                                        </td>
                                        <td className="py-2.5 text-slate-500">{d.updated_by_user?.name ?? '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
