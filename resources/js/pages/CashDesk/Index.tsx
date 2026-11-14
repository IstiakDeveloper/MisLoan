import AdminLayout from '@/layouts/admin-layout';
import { Head, router, useForm } from '@inertiajs/react';

type Branch = { id: number; code: string; name: string };
type Asset = { id: number; code: string; name: string };
type Session = {
    id: number;
    business_date: string;
    status: string;
    opening_count_paisa: number;
    counted_close_paisa: number | null;
    variance_paisa: number | null;
    live_gl_balance_paisa: number;
    cash_account_id: number;
};
type Loan = { id: number; reference: string; application_no: string };
type Savings = { id: number; reference: string };
type Statement = {
    id: number;
    business_date: string;
    amount_paisa: number;
    reference: string;
    matched_journal_line_id: number | null;
    bank_account_id: number;
};
type Journal = {
    id: number;
    ledger_account_id: number;
    debit_paisa: number;
    credit_paisa: number;
    business_date: string;
    description: string;
    code: string;
};
type Props = {
    branchId: number | null;
    branches: Branch[];
    assets: Asset[];
    sessions: Session[];
    loans: Loan[];
    savings: Savings[];
    statements: Statement[];
    journals: Journal[];
    defaults: { loan_cash_account_id: number | null; savings_cash_account_id: number | null } | null;
    handoverUsers: { id: number; name: string }[];
    canReview: boolean;
};

const money = (paisa: number | null) => {
    if (paisa === null) {
        return '—';
    }
    const amount = BigInt(paisa);
    const absolute = amount < 0n ? -amount : amount;
    return `${amount < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const button = 'rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50';

export default function CashDeskIndex({ branchId, branches, assets, sessions, loans, savings, statements, journals, defaults, handoverUsers, canReview }: Props) {
    const open = useForm({
        branch_id: branchId ?? '',
        cash_account_id: defaults?.loan_cash_account_id ?? '',
        business_date: new Date().toISOString().slice(0, 10),
        opening_count: '0.00',
        idempotency_key: `open-${Date.now()}`,
    });
    const collect = useForm({
        account_id: loans[0]?.id ?? '',
        principal_amount: '',
        charge_amount: '0.00',
        cash_account_id: defaults?.loan_cash_account_id ?? '',
        business_date: new Date().toISOString().slice(0, 10),
        idempotency_key: `loan-${Date.now()}`,
        description: 'শাখার আদায়',
    });
    const save = useForm({
        account_id: savings[0]?.id ?? '',
        kind: 'deposit',
        amount: '',
        counter_account_id: defaults?.savings_cash_account_id ?? '',
        business_date: new Date().toISOString().slice(0, 10),
        idempotency_key: `sav-${Date.now()}`,
        description: 'সঞ্চয় জমা',
    });

    return (
        <AdminLayout>
            <Head title="ক্যাশ ডেস্ক" />
            <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 text-slate-900 dark:text-slate-100">
                <header className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-sm text-emerald-700">দৈনন্দিন টাকা</p>
                        <h1 className="text-2xl font-semibold">ক্যাশ ডেস্ক</h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300">আদায়, দিনের গণনা, হস্তান্তর এবং ব্যাংক লাইন মিল। গণনা নতুন জার্নাল বানায় না।</p>
                    </div>
                    {canReview && (
                        <select className={field} value={branchId ?? ''} onChange={(event) => router.get('/cash-desk', { branch_id: event.target.value || undefined })}>
                            <option value="">শাখা বাছুন</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>{branch.code} — {branch.name}</option>
                            ))}
                        </select>
                    )}
                </header>

                <section className="grid gap-4 lg:grid-cols-2">
                    <form className="space-y-3 rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); open.post('/cash-desk/sessions'); }}>
                        <h2 className="font-medium">সেশন খুলুন</h2>
                        <input className={field} value={open.data.opening_count} onChange={(event) => open.setData('opening_count', event.target.value)} placeholder="খোলার সময় গণনা" />
                        <select className={field} value={open.data.cash_account_id} onChange={(event) => open.setData('cash_account_id', event.target.value)}>
                            <option value="">নগদ হিসাব</option>
                            {assets.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}
                        </select>
                        <input className={field} type="date" value={open.data.business_date} onChange={(event) => open.setData('business_date', event.target.value)} />
                        <button className={button} disabled={open.processing || !branchId}>খুলুন</button>
                    </form>
                    <form className="space-y-3 rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); collect.post(`/cash-desk/loans/${collect.data.account_id}/repayments`); }}>
                        <h2 className="font-medium">ঋণ আদায়</h2>
                        <select className={field} value={collect.data.account_id} onChange={(event) => collect.setData('account_id', event.target.value)}>
                            <option value="">ঋণ হিসাব</option>
                            {loans.map((loan) => <option key={loan.id} value={loan.id}>{loan.application_no} — {loan.reference}</option>)}
                        </select>
                        <input className={field} placeholder="আসল" value={collect.data.principal_amount} onChange={(event) => collect.setData('principal_amount', event.target.value)} />
                        <input className={field} placeholder="সার্ভিস চার্জ" value={collect.data.charge_amount} onChange={(event) => collect.setData('charge_amount', event.target.value)} />
                        <button className={button} disabled={collect.processing || !collect.data.account_id}>আদায় পোস্ট</button>
                    </form>
                    <form className="space-y-3 rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); save.post(`/cash-desk/savings/${save.data.account_id}/transactions`); }}>
                        <h2 className="font-medium">সঞ্চয়</h2>
                        <select className={field} value={save.data.account_id} onChange={(event) => save.setData('account_id', event.target.value)}>
                            <option value="">সঞ্চয় হিসাব</option>
                            {savings.map((account) => <option key={account.id} value={account.id}>{account.reference}</option>)}
                        </select>
                        <select className={field} value={save.data.kind} onChange={(event) => save.setData('kind', event.target.value)}>
                            <option value="deposit">জমা</option>
                            <option value="withdrawal">উত্তোলন</option>
                        </select>
                        <input className={field} placeholder="পরিমাণ" value={save.data.amount} onChange={(event) => save.setData('amount', event.target.value)} />
                        <button className={button} disabled={save.processing || !save.data.account_id}>পোস্ট</button>
                    </form>
                </section>

                <section className="space-y-3">
                    <h2 className="font-medium">দিন-শেষ</h2>
                    {sessions.map((session) => (
                        <SessionRow key={session.id} session={session} canReview={canReview} handoverUsers={handoverUsers} />
                    ))}
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                    <StatementForm branchId={branchId} assets={assets} />
                    <div className="space-y-2 rounded-xl border p-4">
                        <h2 className="font-medium">ব্যাংক লাইন</h2>
                        {statements.map((line) => (
                            <StatementMatch key={line.id} line={line} journals={journals} />
                        ))}
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}

function SessionRow({ session, canReview, handoverUsers }: { session: Session; canReview: boolean; handoverUsers: { id: number; name: string }[] }) {
    const submit = useForm({ counted_cash: money(session.live_gl_balance_paisa).replace('-', ''), variance_note: '' });
    const review = useForm({ decision: 'approved', note: 'Counted cash reviewed', handed_over_to: handoverUsers[0]?.id ?? '' });
    return (
        <div className="space-y-2 rounded-xl border p-4">
            <p>{session.business_date} — {session.status} — বইয়ের নগদ {money(session.live_gl_balance_paisa)} — পার্থক্য {money(session.variance_paisa)}</p>
            {session.status === 'open' && (
                <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); submit.post(`/cash-desk/sessions/${session.id}/submit`); }}>
                    <input className={field} value={submit.data.counted_cash} onChange={(event) => submit.setData('counted_cash', event.target.value)} />
                    <input className={field} placeholder="পার্থক্যের ব্যাখ্যা" value={submit.data.variance_note} onChange={(event) => submit.setData('variance_note', event.target.value)} />
                    <button className={button} disabled={submit.processing}>জমা দিন</button>
                </form>
            )}
            {canReview && session.status === 'submitted' && (
                <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); review.post(`/cash-desk/sessions/${session.id}/review`); }}>
                    <select className={field} value={review.data.handed_over_to} onChange={(event) => review.setData('handed_over_to', event.target.value)}>
                        {handoverUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                    </select>
                    <button className={button} disabled={review.processing}>অনুমোদন ও হস্তান্তর</button>
                </form>
            )}
        </div>
    );
}

function StatementForm({ branchId, assets }: { branchId: number | null; assets: Asset[] }) {
    const form = useForm({
        branch_id: branchId ?? '',
        bank_account_id: assets[0]?.id ?? '',
        business_date: new Date().toISOString().slice(0, 10),
        amount: '',
        reference: '',
        description: 'ব্যাংক স্টেটমেন্ট',
    });
    return (
        <form className="space-y-3 rounded-xl border p-4" onSubmit={(event) => { event.preventDefault(); form.post('/cash-desk/statements'); }}>
            <h2 className="font-medium">ব্যাংক স্টেটমেন্ট লাইন</h2>
            <select className={field} value={form.data.bank_account_id} onChange={(event) => form.setData('bank_account_id', event.target.value)}>
                {assets.map((account) => <option key={account.id} value={account.id}>{account.code}</option>)}
            </select>
            <input className={field} placeholder="পরিমাণ, উত্তোলন হলে -" value={form.data.amount} onChange={(event) => form.setData('amount', event.target.value)} />
            <input className={field} placeholder="রেফারেন্স" value={form.data.reference} onChange={(event) => form.setData('reference', event.target.value)} />
            <button className={button} disabled={form.processing || !branchId}>লাইন যোগ</button>
        </form>
    );
}

function StatementMatch({ line, journals }: { line: Statement; journals: Journal[] }) {
    const form = useForm({ journal_line_id: '' });
    const candidates = journals.filter((journal) => journal.ledger_account_id === line.bank_account_id && journal.business_date === line.business_date && journal.debit_paisa - journal.credit_paisa === line.amount_paisa);
    if (line.matched_journal_line_id) {
        return <p>লাইন {line.reference} মিলেছে ({money(line.amount_paisa)})</p>;
    }
    return (
        <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); form.post(`/cash-desk/statements/${line.id}/match`); }}>
            <span>{line.reference} {money(line.amount_paisa)}</span>
            <select className={field} value={form.data.journal_line_id} onChange={(event) => form.setData('journal_line_id', event.target.value)}>
                <option value="">জার্নাল লাইন</option>
                {candidates.map((journal) => <option key={journal.id} value={journal.id}>{journal.code} {journal.description}</option>)}
            </select>
            <button className={button} disabled={form.processing || !form.data.journal_line_id}>মিলান</button>
        </form>
    );
}
