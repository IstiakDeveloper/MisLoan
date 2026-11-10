import {
    FinanceEmpty,
    FinancePages,
    FinancePanel,
    Paisa,
    Status,
    financeInput,
    financeSecondary,
} from '@/components/finance/workspace';
import { accountingUrl } from '@/lib/accounting-navigation';
import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { AccountingProps, Detail } from './types';

export const cell = 'px-5 py-3 text-left align-top';
export function Registers({
    data,
    open,
}: {
    data: AccountingProps;
    open: (type: Detail['type'], id: number) => void;
}) {
    const vouchers = data.section === 'vouchers';
    const [filters, setFilters] = useState({
        q: String(data.filters.q ?? ''),
        from: String(data.filters.from ?? ''),
        to: String(data.filters.to ?? ''),
        voucher_status: String(data.filters.voucher_status ?? 'pending'),
        source: String(data.filters.source ?? 'all'),
    });
    const update = (name: keyof typeof filters, value: string) =>
        setFilters((current) => ({ ...current, [name]: value }));
    return (
        <FinancePanel
            title={vouchers ? 'ভাউচার রেজিস্টার' : 'পোস্টেড জার্নাল রেজিস্টার'}
            description={
                vouchers
                    ? 'অনুমোদনের অপেক্ষায় থাকা ভাউচার আগে দেখানো হচ্ছে। বিস্তারিত খুলে হিসাব যাচাই করুন।'
                    : 'এখানে কেবল ledger-এ পোস্ট হওয়া লেনদেন দেখা যায়।'
            }
        >
            <form
                className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    router.get(
                        accountingUrl(data.section, data.branchId, filters),
                    );
                }}
            >
                <label className="text-xs text-slate-500">
                    খুঁজুন
                    <input
                        className={financeInput}
                        value={filters.q}
                        maxLength={100}
                        placeholder="Reference / বিবরণ"
                        onChange={(event) => update('q', event.target.value)}
                    />
                </label>
                <label className="text-xs text-slate-500">
                    শুরু
                    <input
                        aria-label="From date"
                        type="date"
                        max={data.today}
                        className={financeInput}
                        value={filters.from}
                        onChange={(event) => update('from', event.target.value)}
                    />
                </label>
                <label className="text-xs text-slate-500">
                    শেষ
                    <input
                        aria-label="To date"
                        type="date"
                        max={data.today}
                        className={financeInput}
                        value={filters.to}
                        onChange={(event) => update('to', event.target.value)}
                    />
                </label>
                <label className="text-xs text-slate-500">
                    {vouchers ? 'অবস্থা' : 'উৎস'}
                    <select
                        className={financeInput}
                        value={
                            vouchers ? filters.voucher_status : filters.source
                        }
                        onChange={(event) =>
                            update(
                                vouchers ? 'voucher_status' : 'source',
                                event.target.value,
                            )
                        }
                    >
                        {(vouchers
                            ? ['pending', 'approved', 'rejected', 'all']
                            : ['all', 'manual', 'loan', 'savings']
                        ).map((value) => (
                            <option key={value} value={value}>
                                {value === 'all' ? 'সব' : value}
                            </option>
                        ))}
                    </select>
                </label>
                <button className={`${financeSecondary} self-end`}>
                    <Search className="size-4" />
                    ফিল্টার করুন
                </button>
            </form>
            <RecordTable data={data} vouchers={vouchers} open={open} />
            <FinancePages page={vouchers ? data.vouchers : data.entries} />
        </FinancePanel>
    );
}
export function RecordTable({
    data,
    vouchers,
    open,
    preview = false,
}: {
    data: AccountingProps;
    vouchers: boolean;
    open: (type: Detail['type'], id: number) => void;
    preview?: boolean;
}) {
    const rows = vouchers ? data.vouchers.data : data.entries.data;
    if (!rows.length)
        return (
            <FinanceEmpty
                title="কোনো লেনদেন পাওয়া যায়নি"
                description="নির্বাচিত শাখা ও ফিল্টার অনুযায়ী এখন কোনো রেকর্ড নেই।"
            />
        );
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-xs">
                <thead className="bg-slate-50 text-[10px] tracking-wide text-slate-500 uppercase dark:bg-slate-950">
                    <tr>
                        {[
                            'তারিখ / Reference',
                            'বিবরণ',
                            vouchers
                                ? 'প্রস্তুতকারী / অবস্থা'
                                : 'উৎস / পোস্টকারী',
                            'পরিমাণ',
                            'বিস্তারিত',
                        ].map((label) => (
                            <th key={label} className={cell}>
                                {label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rows.slice(0, preview ? 5 : rows.length).map((row) => (
                        <tr
                            key={row.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800"
                        >
                            <td className={cell}>
                                <div className="font-medium">
                                    {row.business_date}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                    {row.reference}
                                </div>
                            </td>
                            <td className={`${cell} max-w-72`}>
                                <p className="line-clamp-2 leading-relaxed">
                                    {row.description}
                                </p>
                                {'kind' in row && row.kind === 'reversal' && (
                                    <span className="text-amber-700">
                                        Reversal request
                                    </span>
                                )}
                            </td>
                            <td className={cell}>
                                {'status' in row ? (
                                    <>
                                        <Status value={row.status} />
                                        <p className="mt-1 text-slate-500">
                                            {row.requested_by_name}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Status value={row.source_type} />
                                        <p className="mt-1 text-slate-500">
                                            {row.posted_by_name}
                                        </p>
                                    </>
                                )}
                            </td>
                            <td
                                className={`${cell} font-semibold whitespace-nowrap`}
                            >
                                <Paisa
                                    value={
                                        'total_paisa' in row
                                            ? row.total_paisa
                                            : row.debit_paisa
                                    }
                                />
                            </td>
                            <td className={cell}>
                                <button
                                    className="font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                                    onClick={() =>
                                        open(
                                            vouchers ? 'voucher' : 'journal',
                                            row.id,
                                        )
                                    }
                                >
                                    দেখুন →
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
