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
    formatPaisa,
    type FinancePage,
} from '@/components/finance/workspace';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import AdminLayout from '@/layouts/admin-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowUpRight,
    Banknote,
    ChevronRight,
    Download,
    FileText,
    Landmark,
    Loader2,
    Search,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';

type Context = {
    application_no: string;
    member_reference: string | null;
    member_name: string | null;
    member_name_bn: string | null;
    branch_name: string;
    branch_code: string;
    product_name: string | null;
    product_code: string | null;
    samity_name: string | null;
    samity_code: string | null;
    loan_product_id: number | null;
};
type Account = Context & {
    id: number;
    loan_application_id: number;
    status: string;
    opened_on: string;
    disbursed_on: string;
    opening_reference: string;
    contract_principal_paisa: number;
    contract_charge_paisa: number;
};
type Source = Context & {
    id: number;
    status: string;
    approved_amount: string;
    disbursed_amount: string | null;
};
type Contract = {
    principal_paisa: number;
    charge_paisa: number;
    regular_paisa: number;
    last_paisa: number;
    count: number;
    frequency: string;
    disbursed_on: string | null;
    missing_forms?: number[];
    amount_change_pending?: boolean;
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
type Correction = {
    id: number;
    requested_by: number;
    loan_transaction_id: number;
    requested_by_name: string;
    reviewed_by_name: string | null;
    status: string;
    reason: string;
    business_date: string;
    decision_note: string | null;
};
type Schedule = {
    sequence: number;
    due_on: string;
    due_paisa: number;
    paid_paisa: number;
    outstanding_paisa: number;
    overdue_paisa: number;
    principal_due_paisa: number | null;
    charge_due_paisa: number | null;
};
type Props = {
    accounts: FinancePage<Account>;
    account: Account | null;
    unpostedApplications: FinancePage<Source>;
    readyApplications: FinancePage<Source>;
    filters: {
        q?: string;
        branch_id?: string | number;
        product_id?: string | number;
        account_status?: string;
        view?: string;
    };
    workspaceCounts: {
        active: number;
        closed: number;
        unposted: number;
        ready: number;
    };
    branchesList: { id: number; code: string; name: string }[];
    productsList: { id: number; product_code: string; product_name: string }[];
    asOf: string;
    balances: {
        principal_paisa: number;
        charge_paisa: number;
        total_paisa: number;
    } | null;
    overduePaisa: number;
    schedule: Schedule[];
    transactions: FinancePage<Transaction> | null;
    corrections: FinancePage<Correction> | null;
    contractSnapshot: Contract | null;
    ledgerAccounts: { id: number; code: string; name: string; type: string }[];
    reconciliation: {
        matches: boolean;
        difference_paisa: string;
        gl_principal_paisa: string;
        subledger_principal_paisa: string;
    } | null;
};
const today = () =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
const memberName = (row: Context) =>
    row.member_name_bn || row.member_name || row.member_reference || 'Member';
const amountInput = (paisa: number) =>
    `${BigInt(paisa) / 100n}.${String(BigInt(paisa) % 100n).padStart(2, '0')}`;
const openingDefaults = {
    application_id: '',
    mode: 'opening_balance',
    principal_account_id: '',
    charge_income_account_id: '',
    counter_account_id: '',
    business_date: '',
    disbursement_date: '',
    first_due_date: '',
    outstanding_principal: '',
    outstanding_charge: '',
    disbursed_amount: '',
    reference: '',
    posting_reference: '',
    disbursement_method: 'cash',
    disbursement_reference: '',
};
function Field({ title, children }: { title: string; children: ReactNode }) {
    return (
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
            {title}
            {children}
        </label>
    );
}
function Tabs({
    values,
    selected,
    select,
}: {
    values: [string, string][];
    selected: string;
    select: (value: string) => void;
}) {
    return (
        <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-800">
            {values.map(([key, title]) => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={selected === key}
                    onClick={() => select(key)}
                    className={`border-b-2 px-4 py-3 text-xs font-semibold whitespace-nowrap ${selected === key ? 'border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}
                >
                    {title}
                </button>
            ))}
        </div>
    );
}
const th =
    'px-4 py-3 text-left text-[10px] font-medium tracking-wider text-slate-500 uppercase';
const td = 'px-4 py-4 text-xs';

export default function LoanWorkspace(props: Props) {
    const { account, filters, balances, asOf, contractSnapshot: terms } = props;
    const userId = usePage<{ auth: { user: { id: number } } }>().props.auth.user
        .id;
    const [tab, setTab] = useState('overview');
    const [view, setView] = useState(filters.view || 'accounts');
    const [search, setSearch] = useState(filters.q || '');
    const [branch, setBranch] = useState(String(filters.branch_id || ''));
    const [product, setProduct] = useState(String(filters.product_id || ''));
    const [status, setStatus] = useState(filters.account_status || '');
    const [date, setDate] = useState(asOf);
    const [source, setSource] = useState<Source | null>(null);
    const [preview, setPreview] = useState<Contract | null>(null);
    const [previewError, setPreviewError] = useState('');
    const [loading, setLoading] = useState(false);
    const previewRequest = useRef(0);
    const [receiptReview, setReceiptReview] = useState(false);
    const [correcting, setCorrecting] = useState<Transaction | null>(null);
    const [reviewing, setReviewing] = useState<Correction | null>(null);
    const opening = useForm<Record<string, string>>(openingDefaults);
    const receipt = useForm<Record<string, string>>({
        principal_amount: '0',
        charge_amount: '0',
        cash_account_id: '',
        business_date: today(),
        idempotency_key: crypto.randomUUID(),
        description: '',
    });
    const correction = useForm<Record<string, string>>({
        business_date: today(),
        idempotency_key: crypto.randomUUID(),
        reason: '',
    });
    const review = useForm<Record<string, string>>({
        decision: 'approved',
        note: '',
    });
    const isNew = source?.status === 'pending_disbursement';
    const nextInstallment = props.schedule.find(
        (row) => row.outstanding_paisa > 0,
    );
    const refresh = (next = view) => {
        setView(next);
        router.get(
            '/loan-ledger',
            {
                q: search || undefined,
                branch_id: branch || undefined,
                product_id: product || undefined,
                account_status: status || undefined,
                view: next,
            },
            { preserveScroll: true },
        );
    };
    const accountLink = (id: number) =>
        '/loan-ledger?' +
        new URLSearchParams({
            ...Object.fromEntries(
                Object.entries(filters)
                    .filter(([, value]) => value != null)
                    .map(([key, value]) => [key, String(value)]),
            ),
            account_id: String(id),
        });
    const ledgerSelect = (
        key: string,
        title: string,
        type: string,
        data: Record<string, string>,
        set: (key: string, value: string) => void,
    ) => (
        <Field title={title}>
            <select
                required
                className={financeInput}
                value={data[key]}
                onChange={(event) => set(key, event.target.value)}
            >
                <option value="">Select ledger account</option>
                {props.ledgerAccounts
                    .filter((row) => row.type === type)
                    .map((row) => (
                        <option key={row.id} value={row.id}>
                            {row.code} · {row.name}
                        </option>
                    ))}
            </select>
        </Field>
    );
    const fields = (
        data: Record<string, string>,
        set: (key: string, value: string) => void,
        items: [string, string][],
    ) =>
        items.map(([key, title]) => (
            <Field key={key} title={title}>
                <input
                    required
                    maxLength={key.includes('description') ? 1000 : 255}
                    className={financeInput}
                    type={key.includes('date') ? 'date' : 'text'}
                    max={key.includes('date') ? today() : undefined}
                    value={data[key]}
                    onChange={(event) => set(key, event.target.value)}
                />
            </Field>
        ));
    const openSource = async (row: Source) => {
        const request = ++previewRequest.current;
        setSource(row);
        setPreview(null);
        setPreviewError('');
        setLoading(true);
        opening.clearErrors();
        opening.setData({
            ...openingDefaults,
            application_id: String(row.id),
            business_date: today(),
            disbursement_date: today(),
            disbursed_amount: String(row.approved_amount ?? ''),
        });
        try {
            const response = await fetch(`/loan-ledger/contracts/${row.id}`, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            const body = await response.json();
            if (request !== previewRequest.current) return;
            if (!response.ok)
                setPreviewError(
                    Object.values(body.errors ?? {})
                        .flat()
                        .join(' ') ||
                        body.message ||
                        'Unable to read the saved contract.',
                );
            else setPreview(body);
        } catch {
            if (request === previewRequest.current)
                setPreviewError('Unable to load the contract. Try again.');
        } finally {
            if (request === previewRequest.current) setLoading(false);
        }
    };
    const closeSource = () => {
        if (!opening.processing) {
            ++previewRequest.current;
            setSource(null);
        }
    };

    return (
        <AdminLayout>
            <Head title="Loan accounts & collections" />
            <div className="space-y-6 px-4 lg:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase">
                            Loan operations
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {account
                                ? memberName(account)
                                : 'Loan accounts & collections'}
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            {account
                                ? `${account.application_no} · ${account.branch_code} ${account.branch_name} · ${account.product_code || ''} ${account.product_name || ''}`
                                : 'Approved forms, verified contracts and reconciled financial accounts.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {account && (
                            <Link
                                className={financeSecondary}
                                href="/loan-ledger"
                            >
                                <ArrowLeft className="size-4" />
                                All loans
                            </Link>
                        )}
                        <Link
                            className={financeSecondary}
                            href="/loan-portfolio"
                        >
                            <ArrowUpRight className="size-4" />
                            Portfolio & arrears
                        </Link>
                    </div>
                </div>
                {!account && (
                    <>
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            {[
                                {
                                    title: 'Active financial accounts',
                                    value: props.workspaceCounts.active,
                                    icon: Wallet,
                                    target: 'accounts',
                                },
                                {
                                    title: 'Awaiting disbursement',
                                    value: props.workspaceCounts.ready,
                                    icon: Banknote,
                                    target: 'ready',
                                },
                                {
                                    title: 'Disbursed · not posted',
                                    value: props.workspaceCounts.unposted,
                                    icon: Landmark,
                                    target: 'unposted',
                                },
                                {
                                    title: 'Repaid accounts',
                                    value: props.workspaceCounts.closed,
                                    icon: ShieldCheck,
                                    target: 'closed',
                                },
                            ].map((item) => (
                                <button
                                    key={item.title}
                                    type="button"
                                    onClick={() => {
                                        if (item.target === 'closed') {
                                            setStatus('closed');
                                            router.get('/loan-ledger', {
                                                ...filters,
                                                account_status: 'closed',
                                                view: 'accounts',
                                            });
                                        } else refresh(item.target);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                        {item.title}
                                        <item.icon className="size-4 shrink-0 text-emerald-600" />
                                    </div>
                                    <p className="mt-3 text-2xl font-semibold tabular-nums">
                                        {item.value}
                                    </p>
                                    <p className="mt-1 text-[10px] text-slate-400">
                                        Within current search & branch filters
                                    </p>
                                </button>
                            ))}
                        </div>
                        <FinancePanel
                            title="Loan work queue"
                            description="Search by member name, admission reference, application number or product code."
                        >
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    refresh();
                                }}
                                className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]"
                            >
                                <label className="relative">
                                    <Search className="absolute top-3 left-3 size-4 text-slate-400" />
                                    <input
                                        aria-label="Search loans"
                                        placeholder="Member or application…"
                                        className={`${financeInput} mt-0 pl-9`}
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </label>
                                <select
                                    aria-label="Filter branch"
                                    className={`${financeInput} mt-0`}
                                    value={branch}
                                    onChange={(event) =>
                                        setBranch(event.target.value)
                                    }
                                >
                                    <option value="">All branches</option>
                                    {props.branchesList.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            {row.code} · {row.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Filter product"
                                    className={`${financeInput} mt-0`}
                                    value={product}
                                    onChange={(event) =>
                                        setProduct(event.target.value)
                                    }
                                >
                                    <option value="">All products</option>
                                    {props.productsList.map((row) => (
                                        <option key={row.id} value={row.id}>
                                            {row.product_code} ·{' '}
                                            {row.product_name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    aria-label="Filter account status"
                                    className={`${financeInput} mt-0`}
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(event.target.value)
                                    }
                                >
                                    <option value="">
                                        All account statuses
                                    </option>
                                    <option value="active">Active</option>
                                    <option value="closed">Repaid</option>
                                </select>
                                <button className={financeButton}>
                                    Apply filters
                                </button>
                            </form>
                            <Tabs
                                selected={view}
                                select={refresh}
                                values={[
                                    ['accounts', 'Financial accounts'],
                                    [
                                        'ready',
                                        `Awaiting disbursement · ${props.workspaceCounts.ready}`,
                                    ],
                                    [
                                        'unposted',
                                        `Disbursed · not posted · ${props.workspaceCounts.unposted}`,
                                    ],
                                ]}
                            />
                            {view === 'accounts' ? (
                                props.accounts.data.length ? (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[760px] text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        {[
                                                            'Member / application',
                                                            'Branch / samity',
                                                            'Product',
                                                            'Contract principal',
                                                            'Status',
                                                            '',
                                                        ].map((title) => (
                                                            <th
                                                                key={title}
                                                                className={th}
                                                            >
                                                                {title}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {props.accounts.data.map(
                                                        (row) => (
                                                            <tr
                                                                key={row.id}
                                                                className="hover:bg-slate-50/70 dark:hover:bg-slate-800"
                                                            >
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Link
                                                                        className="font-semibold text-emerald-800 dark:text-emerald-300"
                                                                        href={accountLink(
                                                                            row.id,
                                                                        )}
                                                                    >
                                                                        {memberName(
                                                                            row,
                                                                        )}
                                                                    </Link>
                                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                                        {
                                                                            row.application_no
                                                                        }
                                                                    </p>
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {
                                                                        row.branch_code
                                                                    }{' '}
                                                                    ·{' '}
                                                                    {
                                                                        row.branch_name
                                                                    }
                                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                                        {row.samity_name ||
                                                                            '—'}
                                                                    </p>
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {row.product_code ||
                                                                        'Legacy'}
                                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                                        {row.product_name ||
                                                                            'Saved contract'}
                                                                    </p>
                                                                </td>
                                                                <td
                                                                    className={`${td} font-medium`}
                                                                >
                                                                    <Paisa
                                                                        value={
                                                                            row.contract_principal_paisa
                                                                        }
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Status
                                                                        value={
                                                                            row.status
                                                                        }
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Link
                                                                        href={accountLink(
                                                                            row.id,
                                                                        )}
                                                                        aria-label={`Open ${row.application_no}`}
                                                                        className="flex items-center gap-1 text-emerald-700"
                                                                    >
                                                                        Open
                                                                        <ChevronRight className="size-4" />
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <FinancePages page={props.accounts} />
                                    </>
                                ) : (
                                    <FinanceEmpty
                                        title="No financial accounts found"
                                        description="Adjust your filters, disburse an approved application or open a verified ledger for an existing disbursed loan."
                                    />
                                )
                            ) : (
                                (() => {
                                    const page =
                                        view === 'ready'
                                            ? props.readyApplications
                                            : props.unpostedApplications;
                                    return (
                                        <>
                                            <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-3 text-xs leading-relaxed text-amber-900">
                                                {view === 'ready'
                                                    ? 'Final approval and required forms are rechecked. The disbursement, account, schedule and GL post together.'
                                                    : 'These applications are already marked disbursed. Check whether cash is already in the GL before choosing the opening basis.'}
                                            </div>
                                            {page.data.length ? (
                                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {page.data.map((row) => (
                                                        <div
                                                            key={row.id}
                                                            className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                                                        >
                                                            <div>
                                                                <Link
                                                                    href={`/member/loan-applications/${row.id}`}
                                                                    className="text-sm font-semibold hover:text-emerald-700"
                                                                >
                                                                    {memberName(
                                                                        row,
                                                                    )}
                                                                </Link>
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {
                                                                        row.application_no
                                                                    }{' '}
                                                                    ·{' '}
                                                                    {
                                                                        row.branch_code
                                                                    }{' '}
                                                                    {
                                                                        row.branch_name
                                                                    }{' '}
                                                                    ·{' '}
                                                                    {
                                                                        row.product_code
                                                                    }{' '}
                                                                    {
                                                                        row.product_name
                                                                    }
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <p className="text-right text-xs">
                                                                    <span className="block text-[10px] text-slate-400">
                                                                        {view ===
                                                                        'ready'
                                                                            ? 'Approved'
                                                                            : 'Disbursed'}
                                                                    </span>
                                                                    <span className="mt-1 block font-semibold">
                                                                        ৳
                                                                        {row.disbursed_amount ||
                                                                            row.approved_amount}
                                                                    </span>
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    className={
                                                                        financeSecondary
                                                                    }
                                                                    onClick={() =>
                                                                        openSource(
                                                                            row,
                                                                        )
                                                                    }
                                                                >
                                                                    {view ===
                                                                    'ready'
                                                                        ? 'Review & disburse'
                                                                        : 'Verify & open ledger'}
                                                                    <ChevronRight className="size-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <FinanceEmpty
                                                    title={
                                                        view === 'ready'
                                                            ? 'No loans awaiting disbursement'
                                                            : 'No unposted disbursed loans'
                                                    }
                                                    description="This queue follows the existing application workflow within your current filters."
                                                />
                                            )}
                                            <FinancePages page={page} />
                                        </>
                                    );
                                })()
                            )}
                        </FinancePanel>
                    </>
                )}
                {account && balances && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-wrap items-center gap-3">
                                <Status value={account.status} />
                                <span className="text-xs text-slate-500">
                                    {account.member_reference} ·{' '}
                                    {account.samity_name ||
                                        'Samity not recorded'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    className={financeSecondary}
                                    href={`/member/loan-applications/${account.loan_application_id}`}
                                >
                                    <FileText className="size-4" />
                                    Application & forms
                                </Link>
                                <a
                                    className={financeSecondary}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href={`/loan-ledger/accounts/${account.id}/statement?to=${asOf}`}
                                >
                                    <FileText className="size-4" />
                                    Print statement
                                </a>
                                <a
                                    className={financeSecondary}
                                    href={`/loan-ledger/accounts/${account.id}/statement?to=${asOf}&format=csv`}
                                >
                                    <Download className="size-4" />
                                    CSV
                                </a>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            {[
                                [
                                    'Outstanding principal',
                                    balances.principal_paisa,
                                ],
                                [
                                    'Outstanding service charge',
                                    balances.charge_paisa,
                                ],
                                ['Total outstanding', balances.total_paisa],
                                ['Overdue installments', props.overduePaisa],
                            ].map(([label, value]) => (
                                <div
                                    key={String(label)}
                                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <p className="text-[11px] text-slate-500">
                                        {label}
                                    </p>
                                    <p className="mt-2 text-xl font-semibold tracking-tight">
                                        <Paisa value={value} />
                                    </p>
                                </div>
                            ))}
                        </div>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                router.get(
                                    '/loan-ledger',
                                    {
                                        ...filters,
                                        account_id: account.id,
                                        as_of: date,
                                    },
                                    { preserveScroll: true },
                                );
                            }}
                            className="flex flex-wrap items-end justify-between gap-3"
                        >
                            <p className="text-xs text-slate-500">
                                Figures through {asOf} ·{' '}
                                {props.schedule.find(
                                    (row) => row.outstanding_paisa > 0,
                                )?.due_on
                                    ? `Earliest unpaid due: ${props.schedule.find((row) => row.outstanding_paisa > 0)?.due_on}`
                                    : 'All contractual dues covered'}
                            </p>
                            <div className="flex items-end gap-2">
                                <Field title="Statement date">
                                    <input
                                        required
                                        type="date"
                                        min={account.opened_on}
                                        max={today()}
                                        value={date}
                                        onChange={(event) =>
                                            setDate(event.target.value)
                                        }
                                        className={financeInput}
                                    />
                                </Field>
                                <button className={financeSecondary}>
                                    View
                                </button>
                            </div>
                        </form>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                            <Tabs
                                selected={tab}
                                select={setTab}
                                values={[
                                    ['overview', 'Account overview'],
                                    ['collect', 'Collect repayment'],
                                    ['schedule', 'Repayment schedule'],
                                    ['history', 'Transactions'],
                                    ['corrections', 'Corrections & approvals'],
                                ]}
                            />
                            <div className="p-5">
                                {tab === 'overview' && (
                                    <div className="grid gap-6 lg:grid-cols-2">
                                        <div>
                                            <h2 className="text-sm font-semibold">
                                                Saved contractual terms
                                            </h2>
                                            <p className="mt-1 text-xs text-slate-500">
                                                These totals remain fixed when
                                                product settings change.
                                            </p>
                                            <dl className="mt-4 divide-y divide-slate-100 text-xs dark:divide-slate-800">
                                                {[
                                                    [
                                                        'Original principal',
                                                        <Paisa
                                                            value={
                                                                account.contract_principal_paisa
                                                            }
                                                        />,
                                                    ],
                                                    [
                                                        'Contractual charge',
                                                        <Paisa
                                                            value={
                                                                account.contract_charge_paisa
                                                            }
                                                        />,
                                                    ],
                                                    [
                                                        'Repayment frequency',
                                                        terms?.frequency?.replaceAll(
                                                            '_',
                                                            ' ',
                                                        ) || '—',
                                                    ],
                                                    [
                                                        'Installment count',
                                                        terms?.count || '—',
                                                    ],
                                                    [
                                                        'Regular / final installment',
                                                        terms
                                                            ? `${formatPaisa(terms.regular_paisa)} / ${formatPaisa(terms.last_paisa)}`
                                                            : '—',
                                                    ],
                                                    [
                                                        'Disbursed / ledger opening',
                                                        `${account.disbursed_on} / ${account.opened_on}`,
                                                    ],
                                                    [
                                                        'Verification reference',
                                                        account.opening_reference,
                                                    ],
                                                ].map(
                                                    ([label, value], index) => (
                                                        <div
                                                            key={index}
                                                            className="flex justify-between gap-4 py-3"
                                                        >
                                                            <dt className="text-slate-500">
                                                                {label}
                                                            </dt>
                                                            <dd className="max-w-[60%] text-right font-medium break-words">
                                                                {value}
                                                            </dd>
                                                        </div>
                                                    ),
                                                )}
                                            </dl>
                                        </div>
                                        <div>
                                            <div
                                                className={`rounded-xl border p-5 ${props.reconciliation?.matches ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'}`}
                                            >
                                                <ShieldCheck className="mb-3 size-6 text-emerald-700" />
                                                <h3 className="text-sm font-semibold">
                                                    {props.reconciliation
                                                        ?.matches
                                                        ? 'Principal control account reconciles'
                                                        : 'Principal control account needs review'}
                                                </h3>
                                                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                                    Current comparison for all
                                                    loans in this branch sharing
                                                    the principal-control
                                                    account.
                                                </p>
                                                <div className="mt-4 space-y-2 text-xs">
                                                    <p>
                                                        GL principal:{' '}
                                                        <Paisa
                                                            value={
                                                                props
                                                                    .reconciliation
                                                                    ?.gl_principal_paisa ||
                                                                0
                                                            }
                                                        />
                                                    </p>
                                                    <p>
                                                        Subledger principal:{' '}
                                                        <Paisa
                                                            value={
                                                                props
                                                                    .reconciliation
                                                                    ?.subledger_principal_paisa ||
                                                                0
                                                            }
                                                        />
                                                    </p>
                                                    <p className="font-semibold">
                                                        Difference:{' '}
                                                        <Paisa
                                                            value={
                                                                props
                                                                    .reconciliation
                                                                    ?.difference_paisa ||
                                                                0
                                                            }
                                                        />
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-xs leading-relaxed text-slate-500 dark:bg-slate-800">
                                                Principal and service charge are
                                                recorded separately. Charge
                                                income is recognised when
                                                collected. Savings deposits
                                                remain separate transactions.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {tab === 'collect' && (
                                    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                                        <div>
                                            <h2 className="text-sm font-semibold">
                                                Record a loan collection
                                            </h2>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Use the principal and
                                                service-charge amounts from the
                                                approved form.
                                            </p>
                                            {nextInstallment?.paid_paisa ===
                                                0 &&
                                                nextInstallment.principal_due_paisa !==
                                                    null &&
                                                nextInstallment.charge_due_paisa !==
                                                    null &&
                                                balances &&
                                                nextInstallment.principal_due_paisa <=
                                                    balances.principal_paisa &&
                                                nextInstallment.charge_due_paisa <=
                                                    balances.charge_paisa && (
                                                    <button
                                                        type="button"
                                                        className={`${financeSecondary} mt-3`}
                                                        onClick={() =>
                                                            receipt.setData({
                                                                ...receipt.data,
                                                                principal_amount:
                                                                    amountInput(
                                                                        nextInstallment.principal_due_paisa!,
                                                                    ),
                                                                charge_amount:
                                                                    amountInput(
                                                                        nextInstallment.charge_due_paisa!,
                                                                    ),
                                                            })
                                                        }
                                                    >
                                                        Use installment #
                                                        {
                                                            nextInstallment.sequence
                                                        }{' '}
                                                        form split · ৳
                                                        {formatPaisa(
                                                            nextInstallment.due_paisa,
                                                        )}
                                                    </button>
                                                )}
                                            <form
                                                className="mt-5 grid gap-4 sm:grid-cols-2"
                                                onSubmit={(event) => {
                                                    event.preventDefault();
                                                    receipt.clearErrors();
                                                    const valid = (
                                                        value: string,
                                                    ) =>
                                                        /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(
                                                            value,
                                                        );
                                                    if (
                                                        !valid(
                                                            receipt.data
                                                                .principal_amount,
                                                        ) ||
                                                        !valid(
                                                            receipt.data
                                                                .charge_amount,
                                                        ) ||
                                                        Number(
                                                            receipt.data
                                                                .principal_amount,
                                                        ) +
                                                            Number(
                                                                receipt.data
                                                                    .charge_amount,
                                                            ) <=
                                                            0
                                                    )
                                                        receipt.setError(
                                                            'principal_amount',
                                                            'Enter a positive total with exact principal and charge amounts.',
                                                        );
                                                    else setReceiptReview(true);
                                                }}
                                            >
                                                {fields(
                                                    receipt.data,
                                                    receipt.setData,
                                                    [
                                                        [
                                                            'principal_amount',
                                                            'Principal received',
                                                        ],
                                                        [
                                                            'charge_amount',
                                                            'Service charge received',
                                                        ],
                                                        [
                                                            'business_date',
                                                            'Business date',
                                                        ],
                                                    ],
                                                )}
                                                {ledgerSelect(
                                                    'cash_account_id',
                                                    'Cash / bank account',
                                                    'asset',
                                                    receipt.data,
                                                    receipt.setData,
                                                )}
                                                <div className="sm:col-span-2">
                                                    {fields(
                                                        receipt.data,
                                                        receipt.setData,
                                                        [
                                                            [
                                                                'description',
                                                                'Receipt description / payment reference',
                                                            ],
                                                        ],
                                                    )}
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <FinanceErrors
                                                        errors={receipt.errors}
                                                    />
                                                </div>
                                                <button
                                                    className={financeButton}
                                                    disabled={
                                                        receipt.processing ||
                                                        account.status !==
                                                            'active'
                                                    }
                                                >
                                                    Review collection
                                                </button>
                                            </form>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-5 text-xs leading-relaxed text-slate-500 dark:bg-slate-800">
                                            <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-200">
                                                Before posting
                                            </h3>
                                            <p>
                                                Check the member, reference and
                                                business date. The server
                                                validates both component
                                                balances, including later
                                                balances affected by a backdated
                                                receipt, and posts cash and
                                                source ledgers together.
                                            </p>
                                            <p className="mt-3">
                                                The request identity is retained
                                                on a failed retry and changes
                                                only after a successful
                                                collection.
                                            </p>
                                            {account.status !== 'active' && (
                                                <p className="mt-4 font-semibold text-amber-800">
                                                    This account is repaid;
                                                    further collections are
                                                    blocked.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {tab === 'schedule' && (
                                    <>
                                        <h2 className="text-sm font-semibold">
                                            Contractual repayment schedule
                                        </h2>
                                        <p className="mt-1 mb-4 text-xs text-slate-500">
                                            Paid total covers earliest dues
                                            first. Dates follow the verified
                                            weekly/monthly calendar.
                                        </p>
                                        <div className="max-h-[600px] overflow-auto">
                                            <table className="w-full min-w-[620px]">
                                                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        {[
                                                            'No.',
                                                            'Due date',
                                                            'Scheduled due',
                                                            'Covered',
                                                            'Outstanding',
                                                            'Status',
                                                        ].map((label) => (
                                                            <th
                                                                className={th}
                                                                key={label}
                                                            >
                                                                {label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {props.schedule.map(
                                                        (row) => (
                                                            <tr
                                                                key={
                                                                    row.sequence
                                                                }
                                                            >
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {
                                                                        row.sequence
                                                                    }
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {row.due_on}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Paisa
                                                                        value={
                                                                            row.due_paisa
                                                                        }
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Paisa
                                                                        value={
                                                                            row.paid_paisa
                                                                        }
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Paisa
                                                                        value={
                                                                            row.outstanding_paisa
                                                                        }
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Status
                                                                        value={
                                                                            row.outstanding_paisa ===
                                                                            0
                                                                                ? 'paid'
                                                                                : row.overdue_paisa >
                                                                                    0
                                                                                  ? 'overdue'
                                                                                  : 'upcoming'
                                                                        }
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                                {tab === 'history' && (
                                    <>
                                        <h2 className="mb-4 text-sm font-semibold">
                                            Posted transactions through {asOf}
                                        </h2>
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[730px]">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        {[
                                                            'Date / reference',
                                                            'Movement',
                                                            'Principal',
                                                            'Charge',
                                                            'Description',
                                                            '',
                                                        ].map((label) => (
                                                            <th
                                                                key={label}
                                                                className={th}
                                                            >
                                                                {label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {props.transactions?.data.map(
                                                        (row) => (
                                                            <tr key={row.id}>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {
                                                                        row.business_date
                                                                    }
                                                                    <p
                                                                        title={
                                                                            row.reference
                                                                        }
                                                                        className="mt-1 max-w-36 truncate font-mono text-[10px] text-slate-400"
                                                                    >
                                                                        {
                                                                            row.reference
                                                                        }
                                                                    </p>
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Status
                                                                        value={
                                                                            row.kind
                                                                        }
                                                                    />
                                                                    {row.reversal_of && (
                                                                        <p className="mt-1 text-[10px] text-slate-400">
                                                                            Reverses
                                                                            receipt
                                                                            #
                                                                            {
                                                                                row.reversal_of
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Paisa
                                                                        value={
                                                                            row.principal_paisa
                                                                        }
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    <Paisa
                                                                        value={
                                                                            row.charge_paisa
                                                                        }
                                                                    />
                                                                </td>
                                                                <td
                                                                    className={`${td} max-w-64 break-words`}
                                                                >
                                                                    {
                                                                        row.description
                                                                    }
                                                                </td>
                                                                <td
                                                                    className={
                                                                        td
                                                                    }
                                                                >
                                                                    {row.kind ===
                                                                        'repayment' && (
                                                                        <button
                                                                            type="button"
                                                                            className="text-amber-800 hover:underline"
                                                                            onClick={() => {
                                                                                setCorrecting(
                                                                                    row,
                                                                                );
                                                                                correction.reset();
                                                                                correction.clearErrors();
                                                                            }}
                                                                        >
                                                                            Request
                                                                            correction
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        {props.transactions && (
                                            <FinancePages
                                                page={props.transactions}
                                            />
                                        )}
                                    </>
                                )}
                                {tab === 'corrections' && (
                                    <>
                                        <h2 className="text-sm font-semibold">
                                            Independent correction review
                                        </h2>
                                        <p className="mt-1 mb-4 text-xs text-slate-500">
                                            Request a correction from a receipt
                                            in Transactions. A different
                                            administrator must review it before
                                            balances change.
                                        </p>
                                        {props.corrections?.data.length ? (
                                            <div className="space-y-3">
                                                {props.corrections.data.map(
                                                    (row) => (
                                                        <article
                                                            key={row.id}
                                                            className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                                                        >
                                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Status
                                                                        value={
                                                                            row.status
                                                                        }
                                                                    />
                                                                    <span className="text-xs font-semibold">
                                                                        Correction
                                                                        #
                                                                        {row.id}{' '}
                                                                        ·
                                                                        Receipt
                                                                        #
                                                                        {
                                                                            row.loan_transaction_id
                                                                        }
                                                                    </span>
                                                                </div>
                                                                {row.status ===
                                                                    'pending' && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            row.requested_by ===
                                                                            userId
                                                                        }
                                                                        className={
                                                                            financeSecondary
                                                                        }
                                                                        onClick={() => {
                                                                            setReviewing(
                                                                                row,
                                                                            );
                                                                            review.reset();
                                                                            review.clearErrors();
                                                                        }}
                                                                    >
                                                                        {row.requested_by ===
                                                                        userId
                                                                            ? 'Awaiting another reviewer'
                                                                            : 'Review decision'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="mt-3 text-sm">
                                                                {row.reason}
                                                            </p>
                                                            <p className="mt-2 text-xs text-slate-500">
                                                                Requested by{' '}
                                                                {
                                                                    row.requested_by_name
                                                                }{' '}
                                                                · Correction
                                                                date{' '}
                                                                {
                                                                    row.business_date
                                                                }
                                                            </p>
                                                            {row.reviewed_by_name && (
                                                                <p className="mt-2 text-xs text-slate-500">
                                                                    Reviewed by{' '}
                                                                    {
                                                                        row.reviewed_by_name
                                                                    }
                                                                    :{' '}
                                                                    {
                                                                        row.decision_note
                                                                    }
                                                                </p>
                                                            )}
                                                        </article>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <FinanceEmpty
                                                title="No correction requests"
                                                description="Posted receipts remain immutable. Corrections preserve the original receipt and audit trail."
                                            />
                                        )}
                                        {props.corrections && (
                                            <FinancePages
                                                page={props.corrections}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
            <Dialog
                open={source !== null}
                onOpenChange={(open) => {
                    if (!open) closeSource();
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogTitle>
                        {isNew
                            ? 'Review & disburse approved loan'
                            : 'Open verified financial ledger'}
                    </DialogTitle>
                    <DialogDescription>
                        {source
                            ? `${memberName(source)} · ${source.application_no} · ${source.branch_code} ${source.branch_name}`
                            : ''}
                    </DialogDescription>
                    {loading && (
                        <p
                            role="status"
                            className="flex items-center gap-2 py-8 text-sm text-slate-500"
                        >
                            <Loader2 className="size-4 animate-spin" />
                            Checking saved forms and product terms…
                        </p>
                    )}
                    {previewError && (
                        <FinanceErrors errors={{ contract: previewError }} />
                    )}
                    {preview && (
                        <>
                            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-800">
                                {[
                                    [
                                        'Principal',
                                        <Paisa
                                            value={preview.principal_paisa}
                                        />,
                                    ],
                                    [
                                        'Total charge',
                                        <Paisa value={preview.charge_paisa} />,
                                    ],
                                    [
                                        'Repayments',
                                        `${preview.count} · ${preview.frequency.replaceAll('_', ' ')}`,
                                    ],
                                    [
                                        'Regular / final',
                                        `${formatPaisa(preview.regular_paisa)} / ${formatPaisa(preview.last_paisa)}`,
                                    ],
                                ].map(([title, value], index) => (
                                    <div key={index}>
                                        <p className="text-slate-500">
                                            {title}
                                        </p>
                                        <p className="mt-1 font-semibold">
                                            {value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {Boolean(
                                preview.missing_forms?.length ||
                                    preview.amount_change_pending,
                            ) && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                    {preview.missing_forms?.length
                                        ? `Complete saved form(s): ${preview.missing_forms.join(', ')}. `
                                        : ''}
                                    {preview.amount_change_pending
                                        ? 'An amount change is awaiting approval. '
                                        : ''}
                                    <Link
                                        className="underline"
                                        href={`/member/loan-applications/${source?.id}`}
                                    >
                                        Open application & forms
                                    </Link>
                                </div>
                            )}
                            <form
                                className="grid gap-4 sm:grid-cols-2"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    if (isNew)
                                        opening.patch(
                                            `/loan-ledger/applications/${source!.id}/disburse`,
                                            {
                                                onSuccess: () =>
                                                    setSource(null),
                                            },
                                        );
                                    else
                                        opening.post('/loan-ledger/accounts', {
                                            onSuccess: () => setSource(null),
                                        });
                                }}
                            >
                                {!isNew && (
                                    <div className="sm:col-span-2">
                                        <Field title="Posting basis">
                                            <select
                                                className={financeInput}
                                                value={opening.data.mode}
                                                onChange={(event) => {
                                                    const original =
                                                        event.target.value ===
                                                        'disbursement';
                                                    opening.setData({
                                                        ...opening.data,
                                                        mode: event.target
                                                            .value,
                                                        counter_account_id: '',
                                                        business_date: original
                                                            ? preview.disbursed_on!
                                                            : today(),
                                                        outstanding_principal:
                                                            original
                                                                ? amountInput(
                                                                      preview.principal_paisa,
                                                                  )
                                                                : '',
                                                        outstanding_charge:
                                                            original
                                                                ? amountInput(
                                                                      preview.charge_paisa,
                                                                  )
                                                                : '',
                                                    });
                                                }}
                                            >
                                                <option value="opening_balance">
                                                    Audited outstanding opening
                                                    · equity offset
                                                </option>
                                                <option value="disbursement">
                                                    Unposted original
                                                    disbursement · cash / bank
                                                    offset
                                                </option>
                                            </select>
                                        </Field>
                                        <p className="mt-2 text-[11px] leading-relaxed text-amber-800">
                                            Choose original disbursement only
                                            when that cash payment has not
                                            already been posted to the GL.
                                        </p>
                                    </div>
                                )}
                                {isNew ? (
                                    <Field title="Final approved principal">
                                        <input
                                            readOnly
                                            className={financeInput}
                                            value={
                                                opening.data.disbursed_amount
                                            }
                                        />
                                    </Field>
                                ) : (
                                    fields(opening.data, opening.setData, [
                                        [
                                            'outstanding_principal',
                                            'Verified outstanding principal',
                                        ],
                                        [
                                            'outstanding_charge',
                                            'Verified outstanding charge',
                                        ],
                                    ])
                                )}
                                <Field
                                    title={
                                        isNew
                                            ? 'Disbursement date'
                                            : 'Opening business date'
                                    }
                                >
                                    <input
                                        required
                                        type="date"
                                        max={today()}
                                        min={preview.disbursed_on || undefined}
                                        readOnly={
                                            !isNew &&
                                            opening.data.mode === 'disbursement'
                                        }
                                        className={financeInput}
                                        value={opening.data.business_date}
                                        onChange={(event) =>
                                            opening.setData({
                                                ...opening.data,
                                                business_date:
                                                    event.target.value,
                                                disbursement_date:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </Field>
                                <Field title="Verified first installment due date">
                                    <input
                                        required
                                        type="date"
                                        min={
                                            preview.disbursed_on ||
                                            opening.data.business_date
                                        }
                                        className={financeInput}
                                        value={opening.data.first_due_date}
                                        onChange={(event) =>
                                            opening.setData(
                                                'first_due_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                {ledgerSelect(
                                    'principal_account_id',
                                    'Loan principal control account',
                                    'asset',
                                    opening.data,
                                    opening.setData,
                                )}
                                {ledgerSelect(
                                    'charge_income_account_id',
                                    'Collected service-charge income account',
                                    'income',
                                    opening.data,
                                    opening.setData,
                                )}
                                {ledgerSelect(
                                    'counter_account_id',
                                    isNew ||
                                        opening.data.mode === 'disbursement'
                                        ? 'Disbursement cash / bank account'
                                        : 'Audited opening equity account',
                                    isNew ||
                                        opening.data.mode === 'disbursement'
                                        ? 'asset'
                                        : 'equity',
                                    opening.data,
                                    opening.setData,
                                )}
                                <div className="sm:col-span-2">
                                    <Field title="Verification / disbursement reference">
                                        <input
                                            required
                                            maxLength={255}
                                            className={financeInput}
                                            value={opening.data.reference}
                                            onChange={(event) =>
                                                opening.setData({
                                                    ...opening.data,
                                                    reference:
                                                        event.target.value,
                                                    posting_reference:
                                                        event.target.value,
                                                    disbursement_reference:
                                                        event.target.value.slice(
                                                            0,
                                                            100,
                                                        ),
                                                })
                                            }
                                        />
                                    </Field>
                                </div>
                                <div className="sm:col-span-2">
                                    <FinanceErrors errors={opening.errors} />
                                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                                        Check totals, dates and GL accounts.
                                        Approval, required forms, branch access,
                                        contract consistency and the accounting
                                        period are revalidated before money
                                        posts.
                                    </p>
                                </div>
                                <button
                                    disabled={
                                        opening.processing ||
                                        Boolean(
                                            preview.missing_forms?.length ||
                                                preview.amount_change_pending,
                                        )
                                    }
                                    className={`${financeButton} sm:col-span-2`}
                                >
                                    {opening.processing ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Landmark className="size-4" />
                                    )}
                                    {isNew
                                        ? 'Disburse & post financial account'
                                        : 'Confirm verified ledger opening'}
                                </button>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog
                open={receiptReview}
                onOpenChange={(open) => {
                    if (!receipt.processing) setReceiptReview(open);
                }}
            >
                <DialogContent>
                    <DialogTitle>Confirm loan collection</DialogTitle>
                    <DialogDescription>
                        {account
                            ? `${memberName(account)} · ${account.application_no}`
                            : ''}
                    </DialogDescription>
                    <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                        <p>Principal: ৳{receipt.data.principal_amount}</p>
                        <p>Service charge: ৳{receipt.data.charge_amount}</p>
                        <p>
                            Cash / bank:{' '}
                            {
                                props.ledgerAccounts.find(
                                    (row) =>
                                        String(row.id) ===
                                        receipt.data.cash_account_id,
                                )?.name
                            }
                        </p>
                        <p>Business date: {receipt.data.business_date}</p>
                        <p className="text-xs break-words text-slate-500">
                            {receipt.data.description}
                        </p>
                    </div>
                    <FinanceErrors errors={receipt.errors} />
                    <button
                        className={financeButton}
                        disabled={receipt.processing}
                        onClick={() =>
                            receipt.post(
                                `/loan-ledger/accounts/${account!.id}/repayments`,
                                {
                                    onSuccess: () => {
                                        setReceiptReview(false);
                                        receipt.reset(
                                            'principal_amount',
                                            'charge_amount',
                                            'description',
                                        );
                                        receipt.setData(
                                            'idempotency_key',
                                            crypto.randomUUID(),
                                        );
                                        setTab('history');
                                    },
                                },
                            )
                        }
                    >
                        Confirm & post receipt
                    </button>
                </DialogContent>
            </Dialog>
            <Dialog
                open={correcting !== null}
                onOpenChange={(open) => {
                    if (!open && !correction.processing) setCorrecting(null);
                }}
            >
                <DialogContent>
                    <DialogTitle>Request receipt correction</DialogTitle>
                    <DialogDescription>
                        Receipt {correcting?.reference}. A different
                        administrator must approve before money changes.
                    </DialogDescription>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            correction.post(
                                `/loan-ledger/transactions/${correcting!.id}/reverse`,
                                {
                                    onSuccess: () => {
                                        setCorrecting(null);
                                        correction.setData(
                                            'idempotency_key',
                                            crypto.randomUUID(),
                                        );
                                        setTab('corrections');
                                    },
                                },
                            );
                        }}
                    >
                        {fields(correction.data, correction.setData, [
                            ['business_date', 'Correction business date'],
                            ['reason', 'Reason'],
                        ])}
                        <FinanceErrors errors={correction.errors} />
                        <button
                            disabled={correction.processing}
                            className={financeButton}
                        >
                            Submit correction for review
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={reviewing !== null}
                onOpenChange={(open) => {
                    if (!open && !review.processing) setReviewing(null);
                }}
            >
                <DialogContent>
                    <DialogTitle>
                        Review correction #{reviewing?.id}
                    </DialogTitle>
                    <DialogDescription>
                        {reviewing?.reason} · requested by{' '}
                        {reviewing?.requested_by_name}
                    </DialogDescription>
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            review.post(
                                `/loan-ledger/corrections/${reviewing!.id}/review`,
                                { onSuccess: () => setReviewing(null) },
                            );
                        }}
                    >
                        <Field title="Decision">
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
                                    Approve receipt and GL reversal
                                </option>
                                <option value="rejected">
                                    Reject without posting
                                </option>
                            </select>
                        </Field>
                        {fields(review.data, review.setData, [
                            ['note', 'Decision note'],
                        ])}
                        <FinanceErrors errors={review.errors} />
                        <button
                            disabled={review.processing}
                            className={financeButton}
                        >
                            Record reviewed decision
                        </button>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
