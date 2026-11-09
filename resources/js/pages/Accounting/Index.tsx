import AdminLayout from '@/layouts/admin-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Account = { id: number; code: string; name: string; type: string };
type Period = {
    id: number;
    starts_on: string;
    ends_on: string;
    closed_at: string | null;
};
type Entry = {
    id: number;
    reference: string;
    business_date: string;
    description: string;
    reversal_of: number | null;
};
type Balance = {
    ledger_account_id: number;
    debit_paisa: string;
    credit_paisa: string;
};
type Props = {
    branches: { id: number; name: string; code: string }[];
    branchId: number;
    accounts: Account[];
    periods: Period[];
    entries: {
        data: Entry[];
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    trialBalance: Balance[];
};

function money(value: string | bigint): string {
    const n = BigInt(value);
    const absolute = n < 0n ? -n : n;
    return `${n < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

function paisa(value: string): number {
    if (!/^(0|[1-9]\d{0,12})(\.\d{1,2})?$/.test(value))
        throw new Error('সঠিক টাকার পরিমাণ লিখুন (সর্বোচ্চ দুই দশমিক)।');
    const [whole, fraction = ''] = value.split('.');
    const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (amount > 100_000_000_000_000)
        throw new Error('টাকার পরিমাণ অনুমোদিত সীমার বেশি।');
    return amount;
}

function Errors({ errors }: { errors: Record<string, string> }) {
    return (
        <div role="alert" className="text-sm text-red-700">
            {Object.entries(errors).map(([key, text]) => (
                <p key={key}>{text}</p>
            ))}
        </div>
    );
}

export default function Index({
    branches,
    branchId,
    accounts,
    periods,
    entries,
    trialBalance,
}: Props) {
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
    }).format(new Date());
    const account = useForm({ code: '', name: '', type: 'asset' });
    const period = useForm({ branch_id: branchId, starts_on: '', ends_on: '' });
    const journal = useForm({
        branch_id: branchId,
        business_date: today,
        idempotency_key: crypto.randomUUID(),
        description: '',
        lines: [] as {
            account_id: number;
            debit_paisa: number;
            credit_paisa: number;
        }[],
    });
    const reversal = useForm({
        business_date: today,
        idempotency_key: crypto.randomUUID(),
        reason: '',
    });
    const [reversalId, setReversalId] = useState('');
    const [lines, setLines] = useState([
        { account_id: '', debit: '0', credit: '0' },
        { account_id: '', debit: '0', credit: '0' },
    ]);
    const [amountError, setAmountError] = useState('');
    const field =
        'rounded border border-slate-300 bg-white px-3 py-2 text-slate-900';
    const button =
        'rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50';
    const card =
        'space-y-4 rounded-xl border bg-white p-5 text-slate-900 shadow-sm';
    const dr = trialBalance.reduce((sum, b) => sum + BigInt(b.debit_paisa), 0n);
    const cr = trialBalance.reduce(
        (sum, b) => sum + BigInt(b.credit_paisa),
        0n,
    );

    return (
        <AdminLayout>
            <Head title="Accounting" />
            <main className="space-y-6 p-4 md:p-6">
                <h1 className="text-2xl font-semibold">হিসাব ব্যবস্থাপনা</h1>
                <p className="rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
                    এটি পৃথক ম্যানুয়াল জার্নাল লেজার। পুরোনো ঋণ ও সঞ্চয়ের
                    ব্যালান্স এখনো এখানে স্থানান্তর করা হয়নি।
                </p>
                <label className="flex items-center gap-3">
                    শাখা
                    <select
                        className={field}
                        value={branchId}
                        onChange={(e) =>
                            router.get('/accounting', {
                                branch_id: e.target.value,
                            })
                        }
                    >
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.code} — {b.name}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="grid gap-6 lg:grid-cols-2">
                    <form
                        className={card}
                        onSubmit={(e) => {
                            e.preventDefault();
                            account.post('/accounting/accounts', {
                                onSuccess: () => account.reset(),
                            });
                        }}
                    >
                        <h2 className="text-lg font-semibold">
                            নতুন লেজার হিসাব
                        </h2>
                        <Errors errors={account.errors} />
                        <label className="grid gap-1">
                            কোড
                            <input
                                className={field}
                                required
                                value={account.data.code}
                                onChange={(e) =>
                                    account.setData('code', e.target.value)
                                }
                            />
                        </label>
                        <label className="grid gap-1">
                            নাম
                            <input
                                className={field}
                                required
                                value={account.data.name}
                                onChange={(e) =>
                                    account.setData('name', e.target.value)
                                }
                            />
                        </label>
                        <label className="grid gap-1">
                            ধরন
                            <select
                                className={field}
                                value={account.data.type}
                                onChange={(e) =>
                                    account.setData('type', e.target.value)
                                }
                            >
                                {[
                                    'asset',
                                    'liability',
                                    'equity',
                                    'income',
                                    'expense',
                                ].map((t) => (
                                    <option key={t}>{t}</option>
                                ))}
                            </select>
                        </label>
                        <button
                            className={button}
                            disabled={account.processing}
                        >
                            হিসাব তৈরি
                        </button>
                    </form>
                    <form
                        className={card}
                        onSubmit={(e) => {
                            e.preventDefault();
                            period.post('/accounting/periods');
                        }}
                    >
                        <h2 className="text-lg font-semibold">হিসাবকাল তৈরি</h2>
                        <Errors errors={period.errors} />
                        <label className="grid gap-1">
                            শুরুর তারিখ
                            <input
                                className={field}
                                type="date"
                                required
                                value={period.data.starts_on}
                                onChange={(e) =>
                                    period.setData('starts_on', e.target.value)
                                }
                            />
                        </label>
                        <label className="grid gap-1">
                            শেষের তারিখ
                            <input
                                className={field}
                                type="date"
                                required
                                value={period.data.ends_on}
                                onChange={(e) =>
                                    period.setData('ends_on', e.target.value)
                                }
                            />
                        </label>
                        <button
                            className={button}
                            disabled={!branchId || period.processing}
                        >
                            হিসাবকাল তৈরি
                        </button>
                    </form>
                </div>
                <form
                    className={card}
                    onSubmit={(e) => {
                        e.preventDefault();
                        try {
                            const converted = lines.map((l) => ({
                                account_id: Number(l.account_id),
                                debit_paisa: paisa(l.debit),
                                credit_paisa: paisa(l.credit),
                            }));
                            setAmountError('');
                            journal.transform((data) => ({
                                ...data,
                                lines: converted,
                            }));
                            journal.post('/accounting/journals', {
                                onSuccess: () => {
                                    journal.setData(
                                        'idempotency_key',
                                        crypto.randomUUID(),
                                    );
                                    journal.setData('description', '');
                                },
                            });
                        } catch (error) {
                            setAmountError(
                                error instanceof Error
                                    ? error.message
                                    : 'Invalid amount',
                            );
                        }
                    }}
                >
                    <h2 className="text-lg font-semibold">জার্নাল পোস্টিং</h2>
                    <Errors errors={journal.errors} />
                    {amountError && (
                        <p role="alert" className="text-red-700">
                            {amountError}
                        </p>
                    )}
                    <label className="grid gap-1">
                        তারিখ
                        <input
                            className={field}
                            type="date"
                            max={today}
                            required
                            value={journal.data.business_date}
                            onChange={(e) =>
                                journal.setData('business_date', e.target.value)
                            }
                        />
                    </label>
                    <label className="grid gap-1">
                        বিবরণ
                        <input
                            className={field}
                            required
                            maxLength={1000}
                            value={journal.data.description}
                            onChange={(e) =>
                                journal.setData('description', e.target.value)
                            }
                        />
                    </label>
                    {lines.map((line, index) => (
                        <div key={index} className="grid gap-2 md:grid-cols-3">
                            <label className="grid gap-1">
                                হিসাব
                                <select
                                    className={field}
                                    required
                                    value={line.account_id}
                                    onChange={(e) =>
                                        setLines(
                                            lines.map((l, i) =>
                                                i === index
                                                    ? {
                                                          ...l,
                                                          account_id:
                                                              e.target.value,
                                                      }
                                                    : l,
                                            ),
                                        )
                                    }
                                >
                                    <option value="">হিসাব নির্বাচন</option>
                                    {accounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.code} — {a.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="grid gap-1">
                                ডেবিট (টাকা)
                                <input
                                    className={field}
                                    inputMode="decimal"
                                    value={line.debit}
                                    onChange={(e) =>
                                        setLines(
                                            lines.map((l, i) =>
                                                i === index
                                                    ? {
                                                          ...l,
                                                          debit: e.target.value,
                                                      }
                                                    : l,
                                            ),
                                        )
                                    }
                                />
                            </label>
                            <label className="grid gap-1">
                                ক্রেডিট (টাকা)
                                <input
                                    className={field}
                                    inputMode="decimal"
                                    value={line.credit}
                                    onChange={(e) =>
                                        setLines(
                                            lines.map((l, i) =>
                                                i === index
                                                    ? {
                                                          ...l,
                                                          credit: e.target
                                                              .value,
                                                      }
                                                    : l,
                                            ),
                                        )
                                    }
                                />
                            </label>
                        </div>
                    ))}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            className={field}
                            disabled={lines.length >= 100}
                            onClick={() =>
                                setLines([
                                    ...lines,
                                    { account_id: '', debit: '0', credit: '0' },
                                ])
                            }
                        >
                            লাইন যোগ
                        </button>
                        <button
                            className={button}
                            disabled={!branchId || journal.processing}
                        >
                            জার্নাল পোস্ট করুন
                        </button>
                    </div>
                </form>
                <section className={card}>
                    <h2 className="text-lg font-semibold">
                        ট্রায়াল ব্যালান্স — সকল পোস্টিং
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <th>হিসাব</th>
                                    <th>মোট ডেবিট</th>
                                    <th>মোট ক্রেডিট</th>
                                    <th>নেট ডেবিট</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trialBalance.map((b) => (
                                    <tr key={b.ledger_account_id}>
                                        <td>
                                            {
                                                accounts.find(
                                                    (a) =>
                                                        a.id ===
                                                        b.ledger_account_id,
                                                )?.name
                                            }
                                        </td>
                                        <td>{money(b.debit_paisa)}</td>
                                        <td>{money(b.credit_paisa)}</td>
                                        <td>
                                            {money(
                                                BigInt(b.debit_paisa) -
                                                    BigInt(b.credit_paisa),
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-semibold">
                                    <td>মোট</td>
                                    <td>{money(dr)}</td>
                                    <td>{money(cr)}</td>
                                    <td>{dr === cr ? 'মিলেছে' : 'অমিল'}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>
                <section className={card}>
                    <h2 className="text-lg font-semibold">হিসাবকাল</h2>
                    {periods.map((p) => (
                        <div
                            key={p.id}
                            className="flex items-center justify-between gap-3 border-b py-2"
                        >
                            <span>
                                {p.starts_on} → {p.ends_on}{' '}
                                {p.closed_at ? '(বন্ধ)' : '(খোলা)'}
                            </span>
                            {!p.closed_at && (
                                <button
                                    className={field}
                                    onClick={() => {
                                        if (
                                            confirm(
                                                'এই হিসাবকাল বন্ধ করলে নতুন পোস্টিং করা যাবে না। বন্ধ করবেন?',
                                            )
                                        )
                                            router.post(
                                                `/accounting/periods/${p.id}/close`,
                                            );
                                    }}
                                >
                                    বন্ধ করুন
                                </button>
                            )}
                        </div>
                    ))}
                </section>
                <section className={card}>
                    <h2 className="text-lg font-semibold">
                        সাম্প্রতিক জার্নাল
                    </h2>
                    {entries.data.map((entry) => (
                        <div key={entry.id} className="border-b py-2">
                            <p>
                                #{entry.id} · {entry.business_date} ·{' '}
                                {entry.description}{' '}
                                {entry.reversal_of
                                    ? `(Reversal of #${entry.reversal_of})`
                                    : ''}
                            </p>
                            <p className="text-xs break-all text-slate-500">
                                {entry.reference}
                            </p>
                        </div>
                    ))}
                    <div className="flex gap-3">
                        {entries.prev_page_url && (
                            <button
                                className={field}
                                onClick={() =>
                                    router.get(entries.prev_page_url!)
                                }
                            >
                                আগের পৃষ্ঠা
                            </button>
                        )}
                        {entries.next_page_url && (
                            <button
                                className={field}
                                onClick={() =>
                                    router.get(entries.next_page_url!)
                                }
                            >
                                পরের পৃষ্ঠা
                            </button>
                        )}
                    </div>
                </section>
                <form
                    className={card}
                    onSubmit={(e) => {
                        e.preventDefault();
                        reversal.post(
                            `/accounting/journals/${reversalId}/reverse`,
                            {
                                onSuccess: () => {
                                    reversal.reset('reason');
                                    reversal.setData(
                                        'idempotency_key',
                                        crypto.randomUUID(),
                                    );
                                    setReversalId('');
                                },
                            },
                        );
                    }}
                >
                    <h2 className="text-lg font-semibold">
                        ভুল জার্নাল সংশোধন
                    </h2>
                    <p>মূল রেকর্ড অপরিবর্তিত রেখে বিপরীত জার্নাল পোস্ট হবে।</p>
                    <Errors errors={reversal.errors} />
                    <label className="grid gap-1">
                        মূল জার্নাল নম্বর
                        <input
                            className={field}
                            type="number"
                            min="1"
                            required
                            value={reversalId}
                            onChange={(e) => setReversalId(e.target.value)}
                        />
                    </label>
                    <label className="grid gap-1">
                        তারিখ
                        <input
                            className={field}
                            type="date"
                            max={today}
                            required
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
                            className={field}
                            required
                            value={reversal.data.reason}
                            onChange={(e) =>
                                reversal.setData('reason', e.target.value)
                            }
                        />
                    </label>
                    <button className={button} disabled={reversal.processing}>
                        বিপরীত জার্নাল পোস্ট
                    </button>
                </form>
            </main>
        </AdminLayout>
    );
}
