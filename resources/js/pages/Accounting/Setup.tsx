import {
    FinanceEmpty,
    FinanceErrors,
    FinancePages,
    FinancePanel,
    Paisa,
    Status,
    financeButton,
    financeInput,
    financeSecondary,
} from '@/components/finance/workspace';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { accountingUrl } from '@/lib/accounting-navigation';
import { Link, router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { cell } from './Registers';
import type { AccountingProps, Period } from './types';

export default function Setup({ data }: { data: AccountingProps }) {
    const accounts = data.section === 'accounts';
    const [create, setCreate] = useState(false);
    const [closing, setClosing] = useState<Period | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [q, setQ] = useState(String(data.filters.q ?? ''));
    const [type, setType] = useState(
        String(data.filters.account_type ?? 'all'),
    );
    const account = useForm({ code: '', name: '', type: 'asset' });
    const period = useForm({
        branch_id: data.branchId,
        starts_on: data.today,
        ends_on: data.today,
    });
    const close = useForm({});
    return (
        <>
            <FinancePanel
                title={accounts ? 'Chart of accounts' : 'শাখার হিসাবকাল'}
                description={
                    accounts
                        ? 'GL হিসাবের তালিকা পুরো প্রতিষ্ঠানের জন্য। নিচের balance নির্বাচিত শাখার সব পোস্টেড লেনদেনের net debit / credit।'
                        : 'বন্ধ হিসাবকালে নতুন posting হবে না। হিসাবকাল বন্ধ করার আগে pending voucher ও সংশ্লিষ্ট রিপোর্ট যাচাই করুন।'
                }
                action={
                    <button
                        className={financeButton}
                        disabled={!accounts && !data.branchId}
                        onClick={() => setCreate(true)}
                    >
                        <Plus className="size-4" />
                        {accounts ? 'নতুন GL হিসাব' : 'নতুন হিসাবকাল'}
                    </button>
                }
            >
                {accounts ? (
                    <>
                        <form
                            className="flex flex-wrap items-end gap-3 border-b p-5"
                            onSubmit={(event) => {
                                event.preventDefault();
                                router.get(
                                    accountingUrl('accounts', data.branchId, {
                                        q,
                                        account_type: type,
                                    }),
                                );
                            }}
                        >
                            <label className="min-w-48 flex-1 text-xs text-slate-500">
                                কোড / নাম
                                <input
                                    className={financeInput}
                                    maxLength={100}
                                    value={q}
                                    onChange={(event) =>
                                        setQ(event.target.value)
                                    }
                                />
                            </label>
                            <label className="text-xs text-slate-500">
                                ধরন
                                <select
                                    className={financeInput}
                                    value={type}
                                    onChange={(event) =>
                                        setType(event.target.value)
                                    }
                                >
                                    {[
                                        'all',
                                        'asset',
                                        'liability',
                                        'equity',
                                        'income',
                                        'expense',
                                    ].map((item) => (
                                        <option key={item}>{item}</option>
                                    ))}
                                </select>
                            </label>
                            <button className={financeSecondary}>খুঁজুন</button>
                        </form>
                        {!data.chartAccounts.data.length ? (
                            <FinanceEmpty
                                title="GL হিসাব পাওয়া যায়নি"
                                description="ফিল্টার পরিবর্তন করুন অথবা নতুন হিসাব তৈরি করুন।"
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px] text-xs">
                                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950">
                                        <tr>
                                            {[
                                                'কোড / নাম',
                                                'ধরন',
                                                'অবস্থা',
                                                'শাখার net balance',
                                                'Ledger',
                                            ].map((label) => (
                                                <th
                                                    className={cell}
                                                    key={label}
                                                >
                                                    {label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {data.chartAccounts.data.map((item) => {
                                            const balance =
                                                data.trialBalance.find(
                                                    (row) =>
                                                        row.ledger_account_id ===
                                                        item.id,
                                                );
                                            const net =
                                                BigInt(
                                                    balance?.debit_paisa ?? 0,
                                                ) -
                                                BigInt(
                                                    balance?.credit_paisa ?? 0,
                                                );
                                            return (
                                                <tr key={item.id}>
                                                    <td className={cell}>
                                                        <span className="font-mono text-emerald-700">
                                                            {item.code}
                                                        </span>
                                                        <p className="mt-1 font-medium">
                                                            {item.name}
                                                        </p>
                                                    </td>
                                                    <td
                                                        className={`${cell} capitalize`}
                                                    >
                                                        {item.type}
                                                    </td>
                                                    <td className={cell}>
                                                        <Status
                                                            value={
                                                                item.is_active
                                                                    ? 'active'
                                                                    : 'inactive'
                                                            }
                                                        />
                                                    </td>
                                                    <td className={cell}>
                                                        <Paisa
                                                            value={
                                                                net < 0n
                                                                    ? -net
                                                                    : net
                                                            }
                                                        />{' '}
                                                        {net < 0n
                                                            ? 'Cr'
                                                            : net > 0n
                                                              ? 'Dr'
                                                              : ''}
                                                    </td>
                                                    <td className={cell}>
                                                        <Link
                                                            className="font-semibold text-emerald-700"
                                                            href={accountingUrl(
                                                                'reports',
                                                                data.branchId,
                                                                {
                                                                    account_id:
                                                                        item.id,
                                                                    report: 'ledger',
                                                                },
                                                            )}
                                                        >
                                                            দেখুন →
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <FinancePages page={data.chartAccounts} />
                    </>
                ) : !data.periods.length ? (
                    <FinanceEmpty
                        title="হিসাবকাল তৈরি হয়নি"
                        description="এই শাখায় প্রথম হিসাবকাল তৈরি করে entry শুরু করুন।"
                    />
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.periods.map((item) => (
                            <div
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-4 p-5"
                            >
                                <div>
                                    <p className="text-sm font-semibold">
                                        {item.starts_on} — {item.ends_on}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.closed_at
                                            ? `বন্ধ হয়েছে: ${item.closed_at}`
                                            : 'এই সময়ের অনুমোদিত posting গ্রহণ করা যাবে।'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Status
                                        value={
                                            item.closed_at ? 'closed' : 'active'
                                        }
                                    />
                                    {!item.closed_at && (
                                        <button
                                            className={financeSecondary}
                                            onClick={() => {
                                                setConfirmed(false);
                                                close.clearErrors();
                                                setClosing(item);
                                            }}
                                        >
                                            হিসাবকাল বন্ধ করুন
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </FinancePanel>
            <Dialog open={create} onOpenChange={setCreate}>
                <DialogContent>
                    <DialogTitle>
                        {accounts ? 'নতুন GL হিসাব' : 'নতুন হিসাবকাল'}
                    </DialogTitle>
                    <DialogDescription>
                        {accounts
                            ? 'একটি স্বতন্ত্র code এবং পরিষ্কার নাম ব্যবহার করুন।'
                            : 'একই শাখার অন্য হিসাবকালের সঙ্গে তারিখ মিলে যেতে পারবে না।'}
                    </DialogDescription>
                    {accounts ? (
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                account.post('/accounting/accounts', {
                                    onSuccess: () => {
                                        setCreate(false);
                                        account.reset();
                                    },
                                });
                            }}
                        >
                            <FinanceErrors errors={account.errors} />
                            <label className="block text-xs">
                                কোড
                                <input
                                    required
                                    maxLength={32}
                                    className={financeInput}
                                    value={account.data.code}
                                    onChange={(event) =>
                                        account.setData(
                                            'code',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label className="block text-xs">
                                হিসাবের নাম
                                <input
                                    required
                                    maxLength={255}
                                    className={financeInput}
                                    value={account.data.name}
                                    onChange={(event) =>
                                        account.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label className="block text-xs">
                                ধরন
                                <select
                                    className={financeInput}
                                    value={account.data.type}
                                    onChange={(event) =>
                                        account.setData(
                                            'type',
                                            event.target.value,
                                        )
                                    }
                                >
                                    {[
                                        'asset',
                                        'liability',
                                        'equity',
                                        'income',
                                        'expense',
                                    ].map((item) => (
                                        <option key={item}>{item}</option>
                                    ))}
                                </select>
                            </label>
                            <button
                                disabled={account.processing}
                                className={financeButton}
                            >
                                হিসাব তৈরি করুন
                            </button>
                        </form>
                    ) : (
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                period.post('/accounting/periods', {
                                    onSuccess: () => setCreate(false),
                                });
                            }}
                        >
                            <FinanceErrors errors={period.errors} />
                            <label className="block text-xs">
                                শুরু
                                <input
                                    required
                                    type="date"
                                    className={financeInput}
                                    value={period.data.starts_on}
                                    onChange={(event) =>
                                        period.setData(
                                            'starts_on',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label className="block text-xs">
                                শেষ
                                <input
                                    required
                                    type="date"
                                    min={period.data.starts_on}
                                    className={financeInput}
                                    value={period.data.ends_on}
                                    onChange={(event) =>
                                        period.setData(
                                            'ends_on',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <button
                                disabled={period.processing}
                                className={financeButton}
                            >
                                হিসাবকাল তৈরি করুন
                            </button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={!!closing}
                onOpenChange={(value) => {
                    if (!value) setClosing(null);
                }}
            >
                <DialogContent>
                    <DialogTitle>হিসাবকাল বন্ধ করার নিশ্চিতকরণ</DialogTitle>
                    <DialogDescription>
                        {
                            data.branches.find(
                                (branch) => branch.id === data.branchId,
                            )?.name
                        }{' '}
                        · {closing?.starts_on} — {closing?.ends_on} বন্ধ হলে এই
                        সময়ের নতুন posting এবং আগের তারিখের posting আটকে যাবে।
                        এই screen থেকে পুনরায় খোলা যাবে না।
                    </DialogDescription>
                    <FinanceErrors errors={close.errors} />
                    <label className="flex items-start gap-3 text-sm leading-relaxed">
                        <input
                            type="checkbox"
                            className="mt-1"
                            checked={confirmed}
                            onChange={(event) =>
                                setConfirmed(event.target.checked)
                            }
                        />
                        আমি pending voucher ও রিপোর্ট যাচাই করেছি এবং posting
                        বন্ধ হওয়ার বিষয়টি বুঝেছি।
                    </label>
                    <button
                        className={financeButton}
                        disabled={!confirmed || close.processing}
                        onClick={() =>
                            close.post(
                                `/accounting/periods/${closing?.id}/close`,
                                { onSuccess: () => setClosing(null) },
                            )
                        }
                    >
                        নিশ্চিত করে বন্ধ করুন
                    </button>
                </DialogContent>
            </Dialog>
        </>
    );
}
