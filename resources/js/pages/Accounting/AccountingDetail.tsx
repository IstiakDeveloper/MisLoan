import {
    FinanceErrors,
    Paisa,
    Status,
    financeButton,
    financeInput,
    financeSecondary,
} from '@/components/finance/workspace';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import type { SharedData } from '@/types';
import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { Detail } from './types';

export default function AccountingDetail({
    detail,
    loading,
    error,
    active,
    onClose,
    today,
    decided,
    openRecord,
}: {
    detail: Detail | null;
    loading: boolean;
    error: string;
    active: boolean;
    onClose: () => void;
    today: string;
    decided: () => void;
    openRecord: (type: Detail['type'], id: number) => void;
}) {
    const { auth } = usePage<SharedData>().props;
    const review = useForm({ decision: 'approved', note: '' });
    const reverse = useForm({
        business_date: today,
        reason: '',
        idempotency_key: crypto.randomUUID(),
    });
    const [reversing, setReversing] = useState(false);
    const record = detail?.record;
    const total =
        record?.lines.reduce(
            (sum, line) => sum + BigInt(line.debit_paisa),
            0n,
        ) ?? 0n;
    const canReverse =
        detail?.type === 'journal' &&
        record?.source_type === 'manual' &&
        !record.reversal_of &&
        !record.reversed_by &&
        !record.reversal_pending;
    return (
        <Sheet
            open={active}
            onOpenChange={(value) => {
                if (!value) onClose();
            }}
        >
            <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
                <SheetHeader>
                    <SheetTitle>
                        {detail?.type === 'voucher'
                            ? 'ভাউচার যাচাই'
                            : 'লেনদেনের বিস্তারিত'}
                    </SheetTitle>
                    <SheetDescription>
                        {record?.reference ?? 'রেকর্ড লোড হচ্ছে…'}
                    </SheetDescription>
                </SheetHeader>
                <div className="space-y-5 px-5 pb-8">
                    {loading && (
                        <p role="status" className="text-sm text-slate-500">
                            বিস্তারিত আনা হচ্ছে…
                        </p>
                    )}
                    {error && (
                        <p role="alert" className="text-sm text-rose-700">
                            {error}
                        </p>
                    )}
                    {record && detail && (
                        <>
                            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            {detail.branch.code} ·{' '}
                                            {detail.branch.name}
                                        </p>
                                        <p className="mt-2 text-xl font-semibold">
                                            <Paisa value={total} />
                                        </p>
                                    </div>
                                    <Status value={record.status ?? 'posted'} />
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                    ব্যবসায়িক তারিখ: {record.business_date}
                                </p>
                                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                                    {record.description}
                                </p>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-950">
                                        <tr>
                                            <th className="p-3 text-left">
                                                GL হিসাব
                                            </th>
                                            <th className="p-3 text-right">
                                                Debit
                                            </th>
                                            <th className="p-3 text-right">
                                                Credit
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {record.lines.map((line, index) => (
                                            <tr
                                                key={index}
                                                className="border-t border-slate-100 dark:border-slate-800"
                                            >
                                                <td className="p-3">
                                                    <span className="font-mono text-emerald-700">
                                                        {line.code}
                                                    </span>
                                                    <p className="mt-1">
                                                        {line.name}
                                                    </p>
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <Paisa
                                                        value={line.debit_paisa}
                                                    />
                                                </td>
                                                <td className="p-3 text-right whitespace-nowrap">
                                                    <Paisa
                                                        value={
                                                            line.credit_paisa
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="border-t bg-slate-50 font-semibold dark:bg-slate-950">
                                        <tr>
                                            <td className="p-3">মোট</td>
                                            <td className="p-3 text-right">
                                                <Paisa value={total} />
                                            </td>
                                            <td className="p-3 text-right">
                                                <Paisa
                                                    value={record.lines.reduce(
                                                        (sum, line) =>
                                                            sum +
                                                            BigInt(
                                                                line.credit_paisa,
                                                            ),
                                                        0n,
                                                    )}
                                                />
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            {record.journal_entry_id && (
                                <button
                                    className={financeSecondary}
                                    onClick={() =>
                                        openRecord(
                                            'journal',
                                            record.journal_entry_id!,
                                        )
                                    }
                                >
                                    পোস্টেড journal দেখুন →
                                </button>
                            )}
                            {record.reversal_of && (
                                <button
                                    className={financeSecondary}
                                    onClick={() =>
                                        openRecord(
                                            'journal',
                                            record.reversal_of!,
                                        )
                                    }
                                >
                                    মূল journal #{record.reversal_of} দেখুন →
                                </button>
                            )}
                            {record.reversed_by && (
                                <button
                                    className={financeSecondary}
                                    onClick={() =>
                                        openRecord(
                                            'journal',
                                            record.reversed_by!,
                                        )
                                    }
                                >
                                    Reversal journal #{record.reversed_by} দেখুন
                                    →
                                </button>
                            )}
                            <dl className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <dt className="text-slate-500">
                                        {detail.type === 'voucher'
                                            ? 'প্রস্তুতকারী'
                                            : 'পোস্টকারী'}
                                    </dt>
                                    <dd className="mt-1 font-medium">
                                        {record.requested_by_name ??
                                            record.posted_by_name ??
                                            '—'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-slate-500">
                                        {detail.type === 'voucher'
                                            ? 'যাচাইকারী'
                                            : 'উৎস'}
                                    </dt>
                                    <dd className="mt-1 font-medium">
                                        {record.reviewed_by_name ??
                                            record.source_type ??
                                            'এখনো যাচাই হয়নি'}
                                    </dd>
                                </div>
                                {record.decision_note && (
                                    <div className="col-span-2">
                                        <dt className="text-slate-500">
                                            সিদ্ধান্তের মন্তব্য
                                        </dt>
                                        <dd className="mt-1 leading-relaxed whitespace-pre-wrap">
                                            {record.decision_note}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            {detail.type === 'voucher' &&
                                record.status === 'pending' &&
                                (record.requested_by === auth.user.id ? (
                                    <p className="rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                                        আপনি এই ভাউচার তৈরি করেছেন। অন্য একজন
                                        authorized administrator এটি যাচাই
                                        করবেন। অনুমোদনের আগে GL পরিবর্তন হবে না।
                                    </p>
                                ) : (
                                    <form
                                        className="space-y-4 border-t pt-5"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            review.post(
                                                `/accounting/vouchers/${record.id}/review`,
                                                { onSuccess: decided },
                                            );
                                        }}
                                    >
                                        <h3 className="text-sm font-semibold">
                                            যাচাইয়ের সিদ্ধান্ত
                                        </h3>
                                        <FinanceErrors errors={review.errors} />
                                        <label className="block text-xs">
                                            সিদ্ধান্ত
                                            <select
                                                className={financeInput}
                                                value={review.data.decision}
                                                onChange={(event) =>
                                                    review.setData(
                                                        'decision',
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="approved">
                                                    অনুমোদন করে ledger-এ পোস্ট
                                                    করুন
                                                </option>
                                                <option value="rejected">
                                                    প্রত্যাখ্যান করুন
                                                </option>
                                            </select>
                                        </label>
                                        <label className="block text-xs">
                                            যাচাইয়ের মন্তব্য
                                            <textarea
                                                required
                                                maxLength={1000}
                                                className={financeInput}
                                                value={review.data.note}
                                                onChange={(event) =>
                                                    review.setData(
                                                        'note',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <button
                                            className={financeButton}
                                            disabled={review.processing}
                                        >
                                            সিদ্ধান্ত নিশ্চিত করুন
                                        </button>
                                    </form>
                                ))}
                            {detail.type === 'journal' && (
                                <div className="space-y-3 border-t pt-5">
                                    {record.source_type !== 'manual' ? (
                                        <p className="text-xs leading-relaxed text-slate-500">
                                            এই লেনদেন {record.source_type} মডিউল
                                            থেকে এসেছে। সংশোধন সংশ্লিষ্ট মডিউল
                                            থেকে করতে হবে।{' '}
                                            <Link
                                                className="text-emerald-700 underline"
                                                href={
                                                    record.source_type ===
                                                    'loan'
                                                        ? '/loan-ledger'
                                                        : '/savings-ledger'
                                                }
                                            >
                                                মডিউল খুলুন
                                            </Link>
                                        </p>
                                    ) : record.reversed_by ? (
                                        <p className="text-xs text-slate-500">
                                            এই entry ইতিমধ্যে reversal হয়েছে।
                                            Journal #{record.reversed_by}
                                        </p>
                                    ) : record.reversal_pending ? (
                                        <p className="text-xs text-amber-800">
                                            Reversal-এর অনুরোধ যাচাইয়ের অপেক্ষায়
                                            আছে।
                                        </p>
                                    ) : record.reversal_of ? (
                                        <p className="text-xs text-slate-500">
                                            এটি Journal #{record.reversal_of}-এর
                                            reversal।
                                        </p>
                                    ) : null}
                                    {canReverse && !reversing && (
                                        <button
                                            className={financeSecondary}
                                            onClick={() => setReversing(true)}
                                        >
                                            Reversal-এর অনুরোধ করুন
                                        </button>
                                    )}
                                    {canReverse && reversing && (
                                        <form
                                            className="space-y-4 rounded-xl border p-4"
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                reverse.post(
                                                    `/accounting/journals/${record.id}/reverse`,
                                                    { onSuccess: decided },
                                                );
                                            }}
                                        >
                                            <p className="text-xs leading-relaxed text-slate-500">
                                                মূল journal অপরিবর্তিত থাকবে।
                                                অন্য administrator অনুমোদন করলে
                                                বিপরীত entry পোস্ট হবে।
                                            </p>
                                            <FinanceErrors
                                                errors={reverse.errors}
                                            />
                                            <label className="block text-xs">
                                                Reversal তারিখ
                                                <input
                                                    required
                                                    type="date"
                                                    max={today}
                                                    className={financeInput}
                                                    value={
                                                        reverse.data
                                                            .business_date
                                                    }
                                                    onChange={(event) =>
                                                        reverse.setData(
                                                            'business_date',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </label>
                                            <label className="block text-xs">
                                                কারণ
                                                <textarea
                                                    required
                                                    maxLength={1000}
                                                    className={financeInput}
                                                    value={reverse.data.reason}
                                                    onChange={(event) =>
                                                        reverse.setData(
                                                            'reason',
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </label>
                                            <button
                                                className={financeButton}
                                                disabled={reverse.processing}
                                            >
                                                যাচাইয়ের জন্য জমা দিন
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
