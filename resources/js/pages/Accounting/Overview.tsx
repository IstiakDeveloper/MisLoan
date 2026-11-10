import {
    FinancePanel,
    Paisa,
    financeButton,
    financeSecondary,
} from '@/components/finance/workspace';
import { accountingSections, accountingUrl } from '@/lib/accounting-navigation';
import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
import { RecordTable } from './Registers';
import type { AccountingProps, Detail } from './types';

export default function Overview({
    data,
    open,
}: {
    data: AccountingProps;
    open: (type: Detail['type'], id: number) => void;
}) {
    const { summary } = data;
    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: 'অনুমোদনের অপেক্ষায়',
                        value: summary.pending,
                        note: `${summary.reviewable}টি আপনি যাচাই করতে পারবেন`,
                    },
                    {
                        label: 'আজকের পোস্টিং',
                        value: summary.posted_today,
                        note: 'ব্যবসায়িক তারিখ অনুযায়ী journal',
                    },
                    {
                        label: 'সক্রিয় GL হিসাব',
                        value: summary.active_accounts,
                        note: 'প্রতিষ্ঠানের Chart of accounts',
                    },
                    {
                        label: 'চলতি হিসাবকাল',
                        value: summary.current_period
                            ? summary.current_period.closed_at
                                ? 'বন্ধ'
                                : 'খোলা'
                            : 'সেট করা নেই',
                        note: summary.current_period
                            ? `${summary.current_period.starts_on} — ${summary.current_period.ends_on}`
                            : 'ভাউচার জমা দিতে হিসাবকাল প্রয়োজন',
                    },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                    >
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className="mt-3 text-2xl font-semibold tracking-tight">
                            {item.value}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                            {item.note}
                        </p>
                    </div>
                ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <FinancePanel
                    title="কোন কাজটি করবেন?"
                    description="কাজ অনুযায়ী আলাদা workspace খুলুন।"
                >
                    <div className="grid gap-3 p-5 sm:grid-cols-2">
                        {accountingSections
                            .filter((item) =>
                                [
                                    'create',
                                    'vouchers',
                                    'journals',
                                    'reports',
                                ].includes(item.id),
                            )
                            .map((item) => (
                                <Link
                                    href={accountingUrl(item.id, data.branchId)}
                                    key={item.id}
                                    className="group rounded-xl border border-slate-200 p-4 transition hover:border-emerald-400 hover:bg-emerald-50/40 dark:border-slate-700 dark:hover:bg-emerald-950/30"
                                >
                                    <item.icon className="mb-3 size-5 text-emerald-700" />
                                    <div className="flex items-center justify-between text-sm font-semibold">
                                        {item.title}
                                        <ArrowRight className="size-4 text-slate-400 group-hover:text-emerald-700" />
                                    </div>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                        {item.description}
                                    </p>
                                </Link>
                            ))}
                    </div>
                </FinancePanel>
                <FinancePanel
                    title="হিসাবের প্রস্তুতি"
                    description="নির্বাচিত শাখার ledger ও setup-এর অবস্থা।"
                >
                    <div className="space-y-4 p-5">
                        <div className="flex items-start gap-3">
                            <CheckCircle2
                                className={`size-5 shrink-0 ${BigInt(summary.difference_paisa) === 0n ? 'text-emerald-700' : 'text-rose-700'}`}
                            />
                            <div className="text-xs">
                                <p className="font-semibold">
                                    Debit / Credit পার্থক্য
                                </p>
                                <p className="mt-2 text-lg">
                                    <Paisa value={summary.difference_paisa} />
                                </p>
                                <p className="mt-1 text-slate-500">
                                    পোস্টেড GL-এর সমতা; cash reconciliation নয়।
                                </p>
                            </div>
                        </div>
                        <div className="border-t border-slate-100 pt-4 text-xs">
                            <p className="mb-2 flex items-center gap-2 font-semibold">
                                <Clock3 className="size-4" />
                                Entry দেওয়ার আগে
                            </p>
                            <p className="leading-relaxed text-slate-500">
                                GL হিসাব এবং ব্যবসায়িক তারিখের খোলা হিসাবকাল
                                নিশ্চিত করুন। Loan ও savings-এর লেনদেন নিজ নিজ
                                মডিউল থেকে করুন।
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link
                                    className={financeSecondary}
                                    href={accountingUrl(
                                        'accounts',
                                        data.branchId,
                                    )}
                                >
                                    GL হিসাব
                                </Link>
                                <Link
                                    className={financeSecondary}
                                    href={accountingUrl(
                                        'periods',
                                        data.branchId,
                                    )}
                                >
                                    হিসাবকাল
                                </Link>
                            </div>
                        </div>
                    </div>
                </FinancePanel>
            </div>
            <FinancePanel
                title="সাম্প্রতিক পোস্টিং"
                action={
                    <Link
                        className={financeSecondary}
                        href={accountingUrl('journals', data.branchId)}
                    >
                        সব দেখুন
                    </Link>
                }
            >
                <RecordTable data={data} vouchers={false} open={open} preview />
            </FinancePanel>
            <div className="rounded-xl bg-emerald-950 p-5 text-emerald-50 sm:flex sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold">
                        জমা → যাচাই → পোস্টিং
                    </h2>
                    <p className="mt-2 text-xs leading-relaxed text-emerald-200">
                        নতুন manual voucher অন্য একজন authorized administrator
                        অনুমোদন করার পর ledger-এ যোগ হয়।
                    </p>
                </div>
                <Link
                    className={`${financeButton} mt-4 shrink-0 sm:mt-0`}
                    href={accountingUrl('create', data.branchId)}
                >
                    নতুন ভাউচার
                </Link>
            </div>
        </>
    );
}
