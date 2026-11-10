import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Account = {
    id: number;
    reference: string;
    savings_application_id: number;
    status: string;
    opened_on: string;
    opening_reference: string;
};
type LedgerAccount = { id: number; code: string; name: string; type: string };
type Transaction = {
    id: number;
    reference: string;
    kind: string;
    amount_paisa: number;
    business_date: string;
    description: string;
    journal_entry_id: number;
    reversal_of: number | null;
};
type Paginated<T> = {
    data: T[];
    prev_page_url: string | null;
    next_page_url: string | null;
};
type Props = {
    accounts: Paginated<Account>;
    account: Account | null;
    balances: {
        balance_paisa: number;
        held_paisa: number;
        available_paisa: number;
    } | null;
    transactions: Paginated<Transaction> | null;
    holds: { id: number; amount_paisa: number; reason: string }[];
    ledgerAccounts: LedgerAccount[];
    reconciliation: {
        gl_liability_paisa: string;
        subledger_liability_paisa: string;
        difference_paisa: string;
        matches: boolean;
    } | null;
};

const money = (value: number | string) => {
    const amount = BigInt(value);
    const absolute = amount < 0n ? -amount : amount;
    return `${amount < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};
const field =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900';
const button =
    'rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50';
const card =
    'space-y-4 rounded-xl border bg-white p-5 text-slate-900 shadow-sm';
function Errors({ errors }: { errors: Record<string, string> }) {
    return (
        <div role="alert" className="text-sm text-red-700">
            {Object.entries(errors).map(([key, text]) => (
                <p key={key}>{text}</p>
            ))}
        </div>
    );
}
function Pages({ page }: { page: Paginated<unknown> }) {
    return (
        <div className="flex gap-3">
            {page.prev_page_url && (
                <Link href={page.prev_page_url}>আগের পৃষ্ঠা</Link>
            )}
            {page.next_page_url && (
                <Link href={page.next_page_url}>পরের পৃষ্ঠা</Link>
            )}
        </div>
    );
}

export default function Index({
    accounts,
    account,
    balances,
    transactions,
    holds,
    ledgerAccounts,
    reconciliation,
}: Props) {
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
    }).format(new Date());
    const opening = useForm({
        application_id: '',
        liability_account_id: '',
        business_date: today,
        opening_balance: '',
        opening_reference: '',
        offset_account_id: '',
    });
    const transaction = useForm({
        kind: 'deposit',
        amount: '',
        counter_account_id: '',
        business_date: today,
        description: '',
        idempotency_key: crypto.randomUUID(),
    });
    const hold = useForm({
        amount: '',
        reason: '',
        request_key: crypto.randomUUID(),
    });
    const reversal = useForm({
        business_date: today,
        reason: '',
        idempotency_key: crypto.randomUUID(),
    });
    const [reverseId, setReverseId] = useState('');
    const active = account?.status === 'active';
    const counters = ledgerAccounts.filter(
        (a) =>
            a.type ===
            (transaction.data.kind === 'profit' ? 'expense' : 'asset'),
    );
    const selectOptions = (type: string) => (
        <>
            {ledgerAccounts
                .filter((a) => a.type === type)
                .map((a) => (
                    <option key={a.id} value={a.id}>
                        {a.code} — {a.name}
                    </option>
                ))}
        </>
    );

    return (
        <AdminLayout>
            <Head title="Savings Ledger" />
            <main className="space-y-6 p-4 md:p-6">
                <h1 className="text-2xl font-semibold">সঞ্চয়ের লেনদেন লেজার</h1>
                <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">
                    প্রতিটি লেনদেন এই লেজার ও মূল হিসাববইয়ে একসঙ্গে পোস্ট হয়।
                    পুরোনো আবেদন থেকে উদ্বোধনী ব্যালান্স অনুমান করা হয় না;
                    যাচাইকৃত জের আলাদাভাবে ঘোষণা করুন।
                </p>
                <div className="grid gap-6 lg:grid-cols-2">
                    <section className={card}>
                        <h2 className="text-lg font-semibold">
                            হিসাব নির্বাচন
                        </h2>
                        {accounts.data.length === 0 && (
                            <p>এখনো কোনো লেজার খোলা হয়নি।</p>
                        )}
                        {accounts.data.map((a) => (
                            <Link
                                key={a.id}
                                href={`/savings-ledger?account_id=${a.id}`}
                                className={`block rounded border p-3 ${a.id === account?.id ? 'border-emerald-500 bg-emerald-50' : ''}`}
                            >
                                <span className="font-semibold">
                                    লেজার #{a.id} · আবেদন #
                                    {a.savings_application_id}
                                </span>
                                <span className="ml-3 text-sm">
                                    {a.status === 'active' ? 'সক্রিয়' : 'বন্ধ'}
                                </span>
                                <p className="text-xs break-all text-slate-500">
                                    {a.reference}
                                </p>
                            </Link>
                        ))}
                        <Pages page={accounts} />
                    </section>
                    <form
                        className={card}
                        onSubmit={(e) => {
                            e.preventDefault();
                            opening.post('/savings-ledger/accounts', {
                                onSuccess: () => opening.reset(),
                            });
                        }}
                    >
                        <h2 className="text-lg font-semibold">
                            আবেদনের সঞ্চয় লেজার খুলুন
                        </h2>
                        <Errors errors={opening.errors} />
                        <label className="grid gap-1">
                            সক্রিয় সঞ্চয় আবেদন নম্বর (ID)
                            <input
                                type="number"
                                min="1"
                                required
                                className={field}
                                value={opening.data.application_id}
                                onChange={(e) =>
                                    opening.setData(
                                        'application_id',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label className="grid gap-1">
                            সঞ্চয় দায় হিসাব
                            <select
                                required
                                className={field}
                                value={opening.data.liability_account_id}
                                onChange={(e) =>
                                    opening.setData(
                                        'liability_account_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">নির্বাচন করুন</option>
                                {selectOptions('liability')}
                            </select>
                        </label>
                        <label className="grid gap-1">
                            হিসাব শুরুর তারিখ
                            <input
                                type="date"
                                max={today}
                                required
                                className={field}
                                value={opening.data.business_date}
                                onChange={(e) =>
                                    opening.setData(
                                        'business_date',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label className="grid gap-1">
                            যাচাইকৃত উদ্বোধনী জের (টাকা; নতুন হলে 0)
                            <input
                                inputMode="decimal"
                                required
                                className={field}
                                value={opening.data.opening_balance}
                                onChange={(e) =>
                                    opening.setData(
                                        'opening_balance',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label className="grid gap-1">
                            জের যাচাইয়ের রেফারেন্স / নতুন হিসাবের বিবরণ
                            <input
                                required
                                maxLength={255}
                                className={field}
                                value={opening.data.opening_reference}
                                onChange={(e) =>
                                    opening.setData(
                                        'opening_reference',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label className="grid gap-1">
                            উদ্বোধনী সমন্বয় হিসাব (জের থাকলে আবশ্যক)
                            <select
                                className={field}
                                value={opening.data.offset_account_id}
                                onChange={(e) =>
                                    opening.setData(
                                        'offset_account_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">নির্বাচন করুন</option>
                                {selectOptions('equity')}
                            </select>
                        </label>
                        <button
                            className={button}
                            disabled={opening.processing}
                        >
                            লেজার খুলুন
                        </button>
                    </form>
                </div>
                {reconciliation && (
                    <section className={card}>
                        <h2 className="text-lg font-semibold">
                            শাখার সঞ্চয় নিয়ন্ত্রণ হিসাব — একই দায়খাতের সব লেজার
                        </h2>
                        <p>
                            লেজারের মোট দায়: ৳
                            {money(reconciliation.subledger_liability_paisa)} ·
                            GL দায়: ৳{money(reconciliation.gl_liability_paisa)}
                        </p>
                        <p
                            className={
                                reconciliation.matches
                                    ? 'font-semibold text-emerald-700'
                                    : 'font-semibold text-red-700'
                            }
                        >
                            {reconciliation.matches
                                ? 'দুই হিসাব মিলেছে'
                                : `অমিল: ৳${money(reconciliation.difference_paisa)} — মূল লেনদেন ও উদ্বোধনী জের যাচাই করুন।`}
                        </p>
                    </section>
                )}
                {account && balances && (
                    <>
                        <div className="flex gap-4">
                            <a
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-800 underline"
                                href={`/savings-ledger/accounts/${account.id}/statement`}
                            >
                                Print / Save PDF statement
                            </a>
                            <a
                                className="text-emerald-800 underline"
                                href={`/savings-ledger/accounts/${account.id}/statement?format=csv`}
                            >
                                Download statement CSV
                            </a>
                        </div>
                        <section className={card}>
                            <h2 className="text-lg font-semibold">
                                লেজার #{account.id} —{' '}
                                {active ? 'সক্রিয়' : 'বন্ধ'}
                            </h2>
                            <p>
                                শুরু: {account.opened_on} · উদ্বোধনী রেফারেন্স:{' '}
                                {account.opening_reference}
                            </p>
                            <div className="grid gap-4 sm:grid-cols-3">
                                {[
                                    ['মোট ব্যালান্স', balances.balance_paisa],
                                    ['আটকানো টাকা', balances.held_paisa],
                                    ['উত্তোলনযোগ্য', balances.available_paisa],
                                ].map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="rounded-lg bg-slate-50 p-4"
                                    >
                                        <p>{label}</p>
                                        <p className="text-xl font-semibold">
                                            ৳{money(Number(value))}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                        {active && (
                            <form
                                className={card}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    transaction.post(
                                        `/savings-ledger/accounts/${account.id}/transactions`,
                                        {
                                            onSuccess: () => {
                                                transaction.reset(
                                                    'amount',
                                                    'description',
                                                );
                                                transaction.setData(
                                                    'idempotency_key',
                                                    crypto.randomUUID(),
                                                );
                                            },
                                        },
                                    );
                                }}
                            >
                                <h2 className="text-lg font-semibold">
                                    জমা / উত্তোলন / অনুমোদিত মুনাফা
                                </h2>
                                <Errors errors={transaction.errors} />
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="grid gap-1">
                                        লেনদেনের ধরন
                                        <select
                                            className={field}
                                            value={transaction.data.kind}
                                            onChange={(e) => {
                                                transaction.setData(
                                                    'kind',
                                                    e.target.value,
                                                );
                                                transaction.setData(
                                                    'counter_account_id',
                                                    '',
                                                );
                                            }}
                                        >
                                            <option value="deposit">জমা</option>
                                            <option value="withdrawal">
                                                উত্তোলন
                                            </option>
                                            <option value="profit">
                                                অনুমোদিত মুনাফা পোস্টিং
                                            </option>
                                        </select>
                                    </label>
                                    <label className="grid gap-1">
                                        টাকার পরিমাণ
                                        <input
                                            inputMode="decimal"
                                            required
                                            className={field}
                                            value={transaction.data.amount}
                                            onChange={(e) =>
                                                transaction.setData(
                                                    'amount',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="grid gap-1">
                                        {transaction.data.kind === 'profit'
                                            ? 'মুনাফা ব্যয় হিসাব'
                                            : 'নগদ / ব্যাংক হিসাব'}
                                        <select
                                            required
                                            className={field}
                                            value={
                                                transaction.data
                                                    .counter_account_id
                                            }
                                            onChange={(e) =>
                                                transaction.setData(
                                                    'counter_account_id',
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                নির্বাচন করুন
                                            </option>
                                            {counters.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.code} — {a.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="grid gap-1">
                                        তারিখ
                                        <input
                                            type="date"
                                            max={today}
                                            min={account.opened_on}
                                            required
                                            className={field}
                                            value={
                                                transaction.data.business_date
                                            }
                                            onChange={(e) =>
                                                transaction.setData(
                                                    'business_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </label>
                                </div>
                                <label className="grid gap-1">
                                    বিবরণ / অনুমোদনের রেফারেন্স
                                    <input
                                        required
                                        maxLength={1000}
                                        className={field}
                                        value={transaction.data.description}
                                        onChange={(e) =>
                                            transaction.setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <button
                                    className={button}
                                    disabled={transaction.processing}
                                >
                                    লেনদেন পোস্ট করুন
                                </button>
                            </form>
                        )}
                        <section className={card}>
                            <h2 className="text-lg font-semibold">
                                স্টেটমেন্ট ও রসিদ রেফারেন্স
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th>নম্বর / তারিখ</th>
                                            <th>ধরন / বিবরণ</th>
                                            <th>টাকা</th>
                                            <th>জার্নাল</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions?.data.map((t) => (
                                            <tr key={t.id} className="border-b">
                                                <td className="py-3">
                                                    #{t.id} · {t.business_date}
                                                    <p className="max-w-60 text-xs break-all text-slate-500">
                                                        {t.reference}
                                                    </p>
                                                </td>
                                                <td>
                                                    {t.kind} · {t.description}
                                                    {t.reversal_of && (
                                                        <p>
                                                            মূল লেনদেন #
                                                            {t.reversal_of}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap">
                                                    {money(t.amount_paisa)}
                                                </td>
                                                <td>#{t.journal_entry_id}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {transactions && <Pages page={transactions} />}
                        </section>
                        <div className="grid gap-6 lg:grid-cols-2">
                            <section className={card}>
                                <h2 className="text-lg font-semibold">
                                    আটকানো টাকা
                                </h2>
                                {holds.length === 0 && (
                                    <p>কোনো সক্রিয় hold নেই।</p>
                                )}
                                {holds.map((h) => (
                                    <div
                                        key={h.id}
                                        className="flex items-center justify-between gap-3 border-b py-2"
                                    >
                                        <span>
                                            ৳{money(h.amount_paisa)} —{' '}
                                            {h.reason}
                                        </span>
                                        <button
                                            type="button"
                                            className="rounded border px-3 py-2"
                                            onClick={() => {
                                                if (
                                                    confirm(
                                                        'এই hold মুক্ত করবেন?',
                                                    )
                                                )
                                                    router.post(
                                                        `/savings-ledger/holds/${h.id}/release`,
                                                    );
                                            }}
                                        >
                                            মুক্ত করুন
                                        </button>
                                    </div>
                                ))}
                                {active && (
                                    <form
                                        className="space-y-3"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            hold.post(
                                                `/savings-ledger/accounts/${account.id}/holds`,
                                                {
                                                    onSuccess: () => {
                                                        hold.reset(
                                                            'amount',
                                                            'reason',
                                                        );
                                                        hold.setData(
                                                            'request_key',
                                                            crypto.randomUUID(),
                                                        );
                                                    },
                                                },
                                            );
                                        }}
                                    >
                                        <Errors errors={hold.errors} />
                                        <label className="grid gap-1">
                                            আটকানোর পরিমাণ
                                            <input
                                                required
                                                inputMode="decimal"
                                                className={field}
                                                value={hold.data.amount}
                                                onChange={(e) =>
                                                    hold.setData(
                                                        'amount',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="grid gap-1">
                                            কারণ
                                            <input
                                                required
                                                maxLength={255}
                                                className={field}
                                                value={hold.data.reason}
                                                onChange={(e) =>
                                                    hold.setData(
                                                        'reason',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <button
                                            className={button}
                                            disabled={hold.processing}
                                        >
                                            Hold করুন
                                        </button>
                                    </form>
                                )}
                            </section>
                            {active && (
                                <form
                                    className={card}
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        reversal.post(
                                            `/savings-ledger/transactions/${reverseId}/reverse`,
                                            {
                                                onSuccess: () => {
                                                    reversal.reset('reason');
                                                    reversal.setData(
                                                        'idempotency_key',
                                                        crypto.randomUUID(),
                                                    );
                                                    setReverseId('');
                                                },
                                            },
                                        );
                                    }}
                                >
                                    <h2 className="text-lg font-semibold">
                                        ভুল লেনদেন সংশোধন
                                    </h2>
                                    <Errors errors={reversal.errors} />
                                    <label className="grid gap-1">
                                        মূল লেনদেন নম্বর
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            className={field}
                                            value={reverseId}
                                            onChange={(e) =>
                                                setReverseId(e.target.value)
                                            }
                                        />
                                    </label>
                                    <label className="grid gap-1">
                                        সংশোধনের তারিখ
                                        <input
                                            required
                                            type="date"
                                            min={account.opened_on}
                                            max={today}
                                            className={field}
                                            value={reversal.data.business_date}
                                            onChange={(e) =>
                                                reversal.setData(
                                                    'business_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="grid gap-1">
                                        কারণ
                                        <input
                                            required
                                            maxLength={1000}
                                            className={field}
                                            value={reversal.data.reason}
                                            onChange={(e) =>
                                                reversal.setData(
                                                    'reason',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </label>
                                    <button
                                        className={button}
                                        disabled={reversal.processing}
                                    >
                                        Reversal পোস্ট করুন
                                    </button>
                                </form>
                            )}
                        </div>
                        {active && (
                            <section className={card}>
                                <h2 className="text-lg font-semibold">
                                    হিসাব বন্ধ
                                </h2>
                                <p>
                                    ব্যালান্স শূন্য ও সব hold মুক্ত হলে হিসাব
                                    বন্ধ করা যাবে।
                                </p>
                                <button
                                    className="rounded-lg border border-red-300 px-4 py-2 text-red-700"
                                    disabled={
                                        balances.balance_paisa !== 0 ||
                                        balances.held_paisa !== 0
                                    }
                                    onClick={() => {
                                        if (
                                            confirm('সঞ্চয় লেজারটি বন্ধ করবেন?')
                                        )
                                            router.post(
                                                `/savings-ledger/accounts/${account.id}/close`,
                                            );
                                    }}
                                >
                                    হিসাব বন্ধ করুন
                                </button>
                            </section>
                        )}
                    </>
                )}
            </main>
        </AdminLayout>
    );
}
