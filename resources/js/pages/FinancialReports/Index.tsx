import {
    FinanceEmpty,
    FinanceErrors,
    FinancePages,
    FinancePanel,
    Paisa,
    financeButton,
    financeInput,
    financeSecondary,
} from '@/components/finance/workspace';
import { accountingUrl } from '@/lib/accounting-navigation';
import AccountingFrame from '@/pages/Accounting/AccountingFrame';
import { Link, router, usePage } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
type Row = {
    id: number;
    code: string;
    name: string;
    type: string;
    is_active: boolean;
    opening_paisa: string;
    debit_paisa: string;
    credit_paisa: string;
    closing_paisa: string;
    normal_balance_paisa: string;
    period_normal_paisa: string;
};
type Entry = {
    id: number;
    journal_id: number;
    reference: string;
    business_date: string;
    branch_code: string;
    description: string;
    source_type: string;
    reversal_of: number | null;
    debit_paisa: string;
    credit_paisa: string;
    running_paisa: string;
};
type Props = {
    rows: Row[];
    totals: Record<string, string>;
    from: string;
    to: string;
    branchId: number | null;
    accountId: number | null;
    branches: { id: number; code: string; name: string }[];
    accounts: { id: number; code: string; name: string }[];
    ledger: {
        opening_paisa: string;
        entries: {
            data: Entry[];
            prev_page_url: string | null;
            next_page_url: string | null;
        };
    } | null;
};
const reports = [
    {
        id: 'trial',
        title: 'Trial balance',
        description: 'হিসাবের debit ও credit সমতা',
    },
    {
        id: 'income',
        title: 'আয়–ব্যয় বিবরণী',
        description: 'নির্বাচিত সময়ের আয় ও ব্যয়',
    },
    {
        id: 'balance',
        title: 'Balance sheet',
        description: 'শেষ তারিখে সম্পদ ও দায়',
    },
    { id: 'ledger', title: 'GL ledger', description: 'একটি হিসাবের লেনদেন' },
];
const cell = 'px-5 py-3 text-left align-top';
function Signed({ value }: { value: string }) {
    const n = BigInt(value);
    return (
        <>
            <Paisa value={n < 0n ? -n : n} />
            {n < 0n ? ' Cr' : n > 0n ? ' Dr' : ''}
        </>
    );
}
export default function FinancialReports(props: Props & { report: string }) {
    return (
        <Report
            key={`${props.report}-${props.branchId}-${props.accountId}-${props.from}-${props.to}`}
            {...props}
        />
    );
}
function Report({
    rows,
    totals,
    from,
    to,
    branchId,
    accountId,
    branches,
    accounts,
    ledger,
    report,
}: Props & { report: string }) {
    const [start, setStart] = useState(from);
    const [end, setEnd] = useState(to);
    const [account, setAccount] = useState(String(accountId ?? ''));
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const filters = { from, to, report, account_id: accountId ?? undefined };
    const url = (extra: Record<string, string | number | undefined> = {}) =>
        accountingUrl('reports', branchId, { ...filters, ...extra });
    const current = reports.find((item) => item.id === report) ?? reports[0];
    const stat = (label: string, value: string) => (
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-3 text-xl font-semibold">
                <Paisa value={value} />
            </p>
        </div>
    );
    const statement = (type: string) => (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows
                .filter((row) => row.type === type)
                .map((row) => (
                    <div
                        key={row.id}
                        className="flex items-center justify-between gap-4 px-5 py-3 text-xs"
                    >
                        <div>
                            <span className="mr-2 font-mono text-slate-400">
                                {row.code}
                            </span>
                            {row.name}
                        </div>
                        <span className="shrink-0 font-medium">
                            <Paisa
                                value={
                                    ['income', 'expense'].includes(type)
                                        ? row.period_normal_paisa
                                        : row.normal_balance_paisa
                                }
                            />
                        </span>
                    </div>
                ))}
        </div>
    );
    return (
        <AccountingFrame
            section="reports"
            branches={branches}
            branchId={branchId}
            allowAll
            filters={filters}
            actions={
                <>
                    <a
                        className={financeSecondary}
                        href={url({ download: 'balances' })}
                    >
                        <Download className="size-4" />
                        GL balances CSV
                    </a>
                    <button
                        className={financeSecondary}
                        onClick={() => window.print()}
                    >
                        <Printer className="size-4" />
                        Print
                    </button>
                </>
            }
        >
            <FinanceErrors errors={errors} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
                {reports.map((item) => (
                    <Link
                        key={item.id}
                        href={url({ report: item.id })}
                        aria-current={report === item.id ? 'page' : undefined}
                        className={`rounded-xl border p-4 transition ${report === item.id ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950' : 'border-slate-200 bg-white hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900'}`}
                    >
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-2 text-xs text-slate-500">
                            {item.description}
                        </p>
                    </Link>
                ))}
            </div>
            <form
                className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 print:hidden"
                onSubmit={(event) => {
                    event.preventDefault();
                    router.get(
                        url({
                            from: start,
                            to: end,
                            account_id:
                                report === 'ledger' ? account : undefined,
                        }),
                    );
                }}
            >
                <label className="text-xs text-slate-500">
                    শুরু
                    <input
                        required
                        type="date"
                        className={financeInput}
                        value={start}
                        onChange={(event) => setStart(event.target.value)}
                    />
                </label>
                <label className="text-xs text-slate-500">
                    শেষ
                    <input
                        required
                        type="date"
                        min={start}
                        className={financeInput}
                        value={end}
                        onChange={(event) => setEnd(event.target.value)}
                    />
                </label>
                {report === 'ledger' && (
                    <label className="min-w-48 flex-1 text-xs text-slate-500">
                        GL হিসাব
                        <select
                            required
                            className={financeInput}
                            value={account}
                            onChange={(event) => setAccount(event.target.value)}
                        >
                            <option value="">হিসাব নির্বাচন করুন</option>
                            {accounts.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.code} · {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <button className={financeButton}>রিপোর্ট দেখুন</button>
            </form>
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">{current.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                        {report === 'balance'
                            ? `As at ${to}`
                            : `${from} — ${to}`}{' '}
                        ·{' '}
                        {branches.find((item) => item.id === branchId)?.name ??
                            'সব শাখা'}{' '}
                        · Posted GL only
                    </p>
                </div>
                <p className="text-[11px] text-slate-500">
                    Pending voucher এই প্রতিবেদনে অন্তর্ভুক্ত নয়।
                </p>
            </div>
            {report === 'trial' && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {stat('Period debit', totals.debit_paisa)}
                        {stat('Period credit', totals.credit_paisa)}
                        {stat(
                            'Closing difference',
                            totals.trial_difference_paisa,
                        )}
                    </div>
                    <FinancePanel
                        title="Trial balance"
                        description="Opening ও closing-এ Dr / Cr দেখানো হয়েছে; debit ও credit নির্বাচিত সময়ের movement।"
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-xs">
                                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950">
                                    <tr>
                                        {[
                                            'হিসাব',
                                            'Opening',
                                            'Debit',
                                            'Credit',
                                            'Closing',
                                        ].map((label) => (
                                            <th key={label} className={cell}>
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {rows.map((row) => (
                                        <tr key={row.id}>
                                            <td className={cell}>
                                                <Link
                                                    className="font-medium text-emerald-700"
                                                    href={url({
                                                        report: 'ledger',
                                                        account_id: row.id,
                                                    })}
                                                >
                                                    {row.code} · {row.name}
                                                </Link>
                                            </td>
                                            <td className={cell}>
                                                <Signed
                                                    value={row.opening_paisa}
                                                />
                                            </td>
                                            <td className={cell}>
                                                <Paisa
                                                    value={row.debit_paisa}
                                                />
                                            </td>
                                            <td className={cell}>
                                                <Paisa
                                                    value={row.credit_paisa}
                                                />
                                            </td>
                                            <td className={cell}>
                                                <Signed
                                                    value={row.closing_paisa}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t bg-slate-50 font-semibold dark:bg-slate-950">
                                    <tr>
                                        <td className={cell}>মোট movement</td>
                                        <td />
                                        <td className={cell}>
                                            <Paisa value={totals.debit_paisa} />
                                        </td>
                                        <td className={cell}>
                                            <Paisa
                                                value={totals.credit_paisa}
                                            />
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        {!rows.length && (
                            <FinanceEmpty
                                title="GL হিসাব নেই"
                                description="Chart of accounts তৈরি করার পরে এখানে রিপোর্ট পাওয়া যাবে।"
                            />
                        )}
                    </FinancePanel>
                </>
            )}
            {report === 'income' && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {stat('সময়ের আয়', totals.period_income_paisa)}
                        {stat('সময়ের ব্যয়', totals.period_expense_paisa)}
                        {stat(
                            'সময়ের উদ্বৃত্ত / ঘাটতি',
                            totals.period_surplus_paisa,
                        )}
                    </div>
                    <div className="grid items-start gap-5 lg:grid-cols-2">
                        <FinancePanel title="আয় · Income">
                            {statement('income')}
                        </FinancePanel>
                        <FinancePanel title="ব্যয় · Expense">
                            {statement('expense')}
                        </FinancePanel>
                    </div>
                </>
            )}
            {report === 'balance' && (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {stat('সম্পদ', totals.asset_paisa)}
                        {stat('দায়', totals.liability_paisa)}
                        {stat(
                            'সমীকরণের পার্থক্য',
                            totals.balance_sheet_difference_paisa,
                        )}
                    </div>
                    <div className="grid items-start gap-5 lg:grid-cols-2">
                        <FinancePanel title="সম্পদ · Assets">
                            {statement('asset')}
                        </FinancePanel>
                        <div className="space-y-5">
                            <FinancePanel title="দায় · Liabilities">
                                {statement('liability')}
                            </FinancePanel>
                            <FinancePanel title="মূলধন ও সঞ্চিত উদ্বৃত্ত · Equity">
                                {statement('equity')}
                                <div className="flex justify-between gap-3 border-t p-5 text-xs">
                                    <span>
                                        শেষ তারিখ পর্যন্ত সঞ্চিত উদ্বৃত্ত
                                    </span>
                                    <Paisa
                                        value={totals.cumulative_surplus_paisa}
                                    />
                                </div>
                            </FinancePanel>
                        </div>
                    </div>
                </>
            )}
            {report === 'ledger' && (
                <FinancePanel
                    title={
                        accounts.find((item) => item.id === accountId)?.name ??
                        'GL ledger'
                    }
                    description={
                        ledger
                            ? 'Running balance-এ Dr / Cr দেখানো হয়েছে।'
                            : 'উপরে একটি GL হিসাব নির্বাচন করে রিপোর্ট দেখুন।'
                    }
                    action={
                        ledger && (
                            <a
                                className={financeSecondary}
                                href={url({ download: 'ledger' })}
                            >
                                Ledger CSV
                            </a>
                        )
                    }
                >
                    {!ledger ? (
                        <FinanceEmpty
                            title="একটি হিসাব নির্বাচন করুন"
                            description="যে GL হিসাবের লেনদেন দেখতে চান সেটি বেছে নিন।"
                        />
                    ) : (
                        <>
                            <div className="border-b p-5 text-sm">
                                Opening: <Signed value={ledger.opening_paisa} />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[850px] text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-950">
                                        <tr>
                                            {[
                                                'তারিখ / Reference',
                                                'শাখা / বিবরণ',
                                                'উৎস',
                                                'Debit',
                                                'Credit',
                                                'Running',
                                            ].map((label) => (
                                                <th
                                                    key={label}
                                                    className={cell}
                                                >
                                                    {label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {ledger.entries.data.map((entry) => (
                                            <tr key={entry.id}>
                                                <td className={cell}>
                                                    {entry.business_date}
                                                    <p className="mt-1 text-slate-500">
                                                        {entry.reference}
                                                    </p>
                                                </td>
                                                <td
                                                    className={`${cell} max-w-80`}
                                                >
                                                    {entry.branch_code}
                                                    <p className="mt-1">
                                                        {entry.description}
                                                    </p>
                                                </td>
                                                <td className={cell}>
                                                    {entry.source_type}
                                                </td>
                                                <td className={cell}>
                                                    <Paisa
                                                        value={
                                                            entry.debit_paisa
                                                        }
                                                    />
                                                </td>
                                                <td className={cell}>
                                                    <Paisa
                                                        value={
                                                            entry.credit_paisa
                                                        }
                                                    />
                                                </td>
                                                <td className={cell}>
                                                    <Signed
                                                        value={
                                                            entry.running_paisa
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {!ledger.entries.data.length && (
                                <FinanceEmpty
                                    title="এই সময়ে কোনো লেনদেন নেই"
                                    description="Opening balance উপরে দেখানো হয়েছে।"
                                />
                            )}
                            <FinancePages page={ledger.entries} />
                        </>
                    )}
                </FinancePanel>
            )}
        </AccountingFrame>
    );
}
