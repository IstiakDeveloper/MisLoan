import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Page<T> = {
    data: T[];
    prev_page_url: string | null;
    next_page_url: string | null;
};
type Account = {
    id: number;
    loan_application_id: number;
    reference: string;
    status: string;
    opening_reference: string;
    opened_on: string;
};
type Transaction = {
    id: number;
    kind: string;
    reference: string;
    principal_paisa: number;
    charge_paisa: number;
    business_date: string;
    description: string;
    reversal_of: number | null;
};
type Props = {
    accounts: Page<Account>;
    account: Account | null;
    asOf: string;
    balances: {
        principal_paisa: number;
        charge_paisa: number;
        total_paisa: number;
    } | null;
    overduePaisa: number;
    schedule: {
        sequence: number;
        due_on: string;
        due_paisa: number;
        paid_paisa: number;
        outstanding_paisa: number;
    }[];
    transactions: Page<Transaction> | null;
    ledgerAccounts: { id: number; code: string; name: string; type: string }[];
    reconciliation: { matches: boolean; difference_paisa: string } | null;
};
const money = (n: number | string) => {
    const v = BigInt(n);
    const a = v < 0n ? -v : v;
    return `${v < 0n ? '-' : ''}${a / 100n}.${String(a % 100n).padStart(2, '0')}`;
};
const field = 'w-full rounded border p-2';
const button =
    'rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50';
function Pages({ page }: { page: Page<unknown> }) {
    return (
        <div className="flex gap-4">
            {page.prev_page_url && (
                <Link href={page.prev_page_url}>Previous</Link>
            )}
            {page.next_page_url && <Link href={page.next_page_url}>Next</Link>}
        </div>
    );
}
function Errors({ errors }: { errors: Record<string, string> }) {
    return (
        <div role="alert" className="text-red-700">
            {Object.entries(errors).map(([k, v]) => (
                <p key={k}>{v}</p>
            ))}
        </div>
    );
}
export default function LoanLedger({
    accounts,
    account,
    asOf,
    balances,
    overduePaisa,
    schedule,
    transactions,
    ledgerAccounts,
    reconciliation,
}: Props) {
    const today = new Date().toLocaleDateString('en-CA');
    const opening = useForm<Record<string, string>>({
        application_id: '',
        principal_account_id: '',
        charge_income_account_id: '',
        counter_account_id: '',
        mode: 'opening_balance',
        business_date: today,
        first_due_date: '',
        outstanding_principal: '',
        outstanding_charge: '',
        reference: '',
    });
    const receipt = useForm<Record<string, string>>({
        principal_amount: '',
        charge_amount: '',
        cash_account_id: '',
        business_date: today,
        idempotency_key: crypto.randomUUID(),
        description: '',
    });
    const correction = useForm<Record<string, string>>({
        transaction_id: '',
        business_date: today,
        idempotency_key: crypto.randomUUID(),
        reason: '',
    });
    const [contract, setContract] = useState('');
    const [date, setDate] = useState(asOf);
    const inputs = (
        data: Record<string, string>,
        set: (key: string, value: string) => void,
        keys: string[],
    ) =>
        keys.map((key) => (
            <label key={key} className="block">
                {key.replaceAll('_', ' ')}
                <input
                    required
                    className={field}
                    type={key.includes('date') ? 'date' : 'text'}
                    value={data[key]}
                    onChange={(e) => set(key, e.target.value)}
                />
            </label>
        ));
    const select = (
        key: string,
        value: string,
        set: (key: string, value: string) => void,
        type: string,
    ) => (
        <label className="block">
            {key.replaceAll('_', ' ')}
            <select
                required
                className={field}
                value={value}
                onChange={(e) => set(key, e.target.value)}
            >
                <option value="">Select account</option>
                {ledgerAccounts
                    .filter((a) => a.type === type)
                    .map((a) => (
                        <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                        </option>
                    ))}
            </select>
        </label>
    );
    return (
        <AdminLayout>
            <Head title="Loan ledger" />
            <div className="space-y-6 p-4 text-slate-900">
                <h1 className="text-2xl font-semibold">Loan ledger</h1>
                <p>
                    Saved contractual totals are preserved. Enter principal and
                    service charge separately for each collection. Charge income
                    is recognised when collected. Due dates follow the declared
                    weekly/monthly calendar without holiday adjustments.
                </p>
                <section className="space-y-3 rounded border bg-white p-4">
                    <h2 className="text-xl">
                        Open from a verified disbursed loan
                    </h2>
                    <p>
                        For existing loans, enter audited outstanding balances
                        and an opening equity account. Use disbursement mode
                        only when the original cash payment has not already been
                        posted to the GL. The first due date is the original
                        contractual first installment date.
                    </p>
                    <form
                        className="grid gap-3 md:grid-cols-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            opening.post('/loan-ledger/accounts');
                        }}
                    >
                        {inputs(opening.data, opening.setData, [
                            'application_id',
                        ])}
                        <div>
                            <button
                                type="button"
                                className={button}
                                onClick={async () => {
                                    try {
                                        const response = await fetch(
                                            `/loan-ledger/contracts/${opening.data.application_id}`,
                                            {
                                                headers: {
                                                    Accept: 'application/json',
                                                },
                                            },
                                        );
                                        const data = await response.json();
                                        setContract(
                                            response.ok
                                                ? `Principal ${money(data.principal_paisa)}, charge ${money(data.charge_paisa)}, ${data.count} ${data.frequency} installments; regular ${money(data.regular_paisa)}, last ${money(data.last_paisa)}, disbursed ${data.disbursed_on}`
                                                : data.message ||
                                                      'Unable to read contract',
                                        );
                                    } catch {
                                        setContract('Unable to read contract');
                                    }
                                }}
                            >
                                Check saved contract
                            </button>
                            <p role="status">{contract}</p>
                        </div>
                        <label>
                            Opening mode
                            <select
                                className={field}
                                value={opening.data.mode}
                                onChange={(e) => {
                                    opening.setData('mode', e.target.value);
                                    opening.setData('counter_account_id', '');
                                }}
                            >
                                <option value="opening_balance">
                                    Audited opening balance
                                </option>
                                <option value="disbursement">
                                    Original disbursement
                                </option>
                            </select>
                        </label>
                        {select(
                            'principal_account_id',
                            opening.data.principal_account_id,
                            opening.setData,
                            'asset',
                        )}
                        {select(
                            'charge_income_account_id',
                            opening.data.charge_income_account_id,
                            opening.setData,
                            'income',
                        )}
                        {select(
                            'counter_account_id',
                            opening.data.counter_account_id,
                            opening.setData,
                            opening.data.mode === 'disbursement'
                                ? 'asset'
                                : 'equity',
                        )}
                        {inputs(opening.data, opening.setData, [
                            'business_date',
                            'first_due_date',
                            'outstanding_principal',
                            'outstanding_charge',
                            'reference',
                        ])}
                        <Errors errors={opening.errors} />
                        <button
                            className={button}
                            disabled={opening.processing}
                        >
                            Open loan ledger
                        </button>
                    </form>
                </section>
                <section className="rounded border bg-white p-4">
                    <h2 className="text-xl">Accounts</h2>
                    {accounts.data.map((a) => (
                        <p key={a.id}>
                            <Link
                                className="text-emerald-800 underline"
                                href={`/loan-ledger?account_id=${a.id}`}
                            >
                                #{a.id} · application {a.loan_application_id} ·{' '}
                                {a.status} · {a.reference}
                            </Link>
                        </p>
                    ))}
                    <Pages page={accounts} />
                </section>
                {account && balances && (
                    <>
                        <section className="space-y-3 rounded border bg-white p-4">
                            <h2 className="text-xl">
                                Account #{account.id} · {account.status}
                            </h2>
                            <p>
                                Opening evidence: {account.opening_reference} (
                                {account.opened_on})
                            </p>
                            <form
                                className="flex gap-3"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    router.get('/loan-ledger', {
                                        account_id: account.id,
                                        as_of: date,
                                    });
                                }}
                            >
                                <label>
                                    As of{' '}
                                    <input
                                        required
                                        className={field}
                                        type="date"
                                        value={date}
                                        onChange={(e) =>
                                            setDate(e.target.value)
                                        }
                                    />
                                </label>
                                <button className={button}>
                                    View statement
                                </button>
                            </form>
                            <p>
                                Principal: ৳{money(balances.principal_paisa)} ·
                                Charge: ৳{money(balances.charge_paisa)} · Total:
                                ৳{money(balances.total_paisa)} · Overdue: ৳
                                {money(overduePaisa)}
                            </p>
                            <p>
                                Current branch principal GL reconciliation:{' '}
                                {reconciliation?.matches
                                    ? 'Matched'
                                    : `Difference ৳${money(reconciliation?.difference_paisa ?? '0')}`}{' '}
                                (all accounts sharing this control account).
                            </p>
                        </section>
                        <section className="space-y-3 rounded border bg-white p-4">
                            <h2 className="text-xl">Collect repayment</h2>
                            <form
                                className="grid gap-3 md:grid-cols-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    receipt.post(
                                        `/loan-ledger/accounts/${account.id}/repayments`,
                                        {
                                            onSuccess: () => {
                                                receipt.reset(
                                                    'principal_amount',
                                                    'charge_amount',
                                                    'description',
                                                );
                                                receipt.setData(
                                                    'idempotency_key',
                                                    crypto.randomUUID(),
                                                );
                                            },
                                        },
                                    );
                                }}
                            >
                                {inputs(receipt.data, receipt.setData, [
                                    'principal_amount',
                                    'charge_amount',
                                    'business_date',
                                    'description',
                                ])}
                                {select(
                                    'cash_account_id',
                                    receipt.data.cash_account_id,
                                    receipt.setData,
                                    'asset',
                                )}
                                <Errors errors={receipt.errors} />
                                <button
                                    className={button}
                                    disabled={
                                        receipt.processing ||
                                        account.status !== 'active'
                                    }
                                >
                                    Post collection
                                </button>
                            </form>
                        </section>
                        <section className="space-y-3 rounded border bg-white p-4">
                            <h2 className="text-xl">Receipt correction</h2>
                            <form
                                className="grid gap-3 md:grid-cols-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    correction.post(
                                        `/loan-ledger/transactions/${correction.data.transaction_id}/reverse`,
                                        {
                                            onSuccess: () => {
                                                correction.reset(
                                                    'transaction_id',
                                                    'reason',
                                                );
                                                correction.setData(
                                                    'idempotency_key',
                                                    crypto.randomUUID(),
                                                );
                                            },
                                        },
                                    );
                                }}
                            >
                                {inputs(correction.data, correction.setData, [
                                    'transaction_id',
                                    'business_date',
                                    'reason',
                                ])}
                                <Errors errors={correction.errors} />
                                <button
                                    className={button}
                                    disabled={correction.processing}
                                >
                                    Reverse receipt
                                </button>
                            </form>
                        </section>
                        <section className="overflow-auto rounded border bg-white p-4">
                            <h2 className="text-xl">
                                Transactions through {asOf}
                            </h2>
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        {[
                                            'Receipt',
                                            'Date',
                                            'Kind',
                                            'Principal movement',
                                            'Charge movement',
                                            'Description',
                                        ].map((h) => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions?.data.map((t) => (
                                        <tr key={t.id}>
                                            <td>
                                                #{t.id}
                                                <small className="block">
                                                    {t.reference}
                                                </small>
                                            </td>
                                            <td>{t.business_date}</td>
                                            <td>
                                                {t.kind}
                                                {t.reversal_of
                                                    ? ` of #${t.reversal_of}`
                                                    : ''}
                                            </td>
                                            <td>{money(t.principal_paisa)}</td>
                                            <td>{money(t.charge_paisa)}</td>
                                            <td>{t.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {transactions && <Pages page={transactions} />}
                        </section>
                        <section className="overflow-auto rounded border bg-white p-4">
                            <h2 className="text-xl">Contractual schedule</h2>
                            <p>
                                Total receipts cover earliest dues first; this
                                table does not invent a reducing
                                principal/charge split.
                            </p>
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        {[
                                            'No.',
                                            'Due date',
                                            'Due',
                                            'Paid',
                                            'Outstanding',
                                        ].map((h) => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule.map((s) => (
                                        <tr key={s.sequence}>
                                            <td>{s.sequence}</td>
                                            <td>{s.due_on}</td>
                                            <td>{money(s.due_paisa)}</td>
                                            <td>{money(s.paid_paisa)}</td>
                                            <td>
                                                {money(s.outstanding_paisa)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
