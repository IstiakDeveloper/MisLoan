import { Head, Link, router, useForm } from '@inertiajs/react';
import { Banknote, Building2, CheckCircle2, Landmark, PlusCircle, Save, Wallet, XCircle } from 'lucide-react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';

interface BranchRow {
    id: number;
    name: string;
    code: string;
    accounting_enabled: boolean;
}

interface LedgerAccount {
    id: number;
    code: string;
    name: string;
    type: string;
}

interface BranchBankAccount {
    id: number;
    branch_id: number;
    ledger_account_id: number;
    bank_name: string;
    branch_name?: string | null;
    account_number: string;
    account_title?: string | null;
    is_default: boolean;
    is_active: boolean;
    ledger_account?: LedgerAccount | null;
}

interface PostingDefaultRow {
    id: number;
    scope: string;
    product_id: number | null;
    event_key: string;
    ledger_account?: LedgerAccount | null;
}

interface DisbursementSummaryRow {
    payment_mode: string;
    branch_bank_account_id: number | null;
    tx_count: number;
    total_paisa: number;
    branch_bank_account?: { id: number; bank_name: string; account_number: string } | null;
}

interface RecentDisbursementRow {
    id: number;
    business_date: string;
    total_paisa: number;
    payment_mode: string;
    bank_reference?: string | null;
    loan_account?: { id: number; account_no: string } | null;
    branch_bank_account?: { id: number; bank_name: string; account_number: string } | null;
    creator?: { id: number; name: string } | null;
}

interface Props {
    branches: BranchRow[];
    selectedBranch: BranchRow | null;
    dayState: { has_open_day?: boolean; business_date?: string | null } | null;
    enrollment: {
        initial_date?: string;
        financial_year?: { id: number; name: string; status: string } | null;
    } | null;
    bankAccounts: BranchBankAccount[];
    branchDefaults: PostingDefaultRow[];
    globalDefaults: PostingDefaultRow[];
    ledgerAccounts: LedgerAccount[];
    eventKeys: Record<string, string>;
    disbursementSummary: DisbursementSummaryRow[];
    recentDisbursements: RecentDisbursementRow[];
    canManage: boolean;
}

const fmt = (paisa: number) => `৳${(Number(paisa || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function BranchAccountSetup({
    branches,
    selectedBranch,
    dayState,
    enrollment,
    bankAccounts,
    branchDefaults,
    globalDefaults,
    ledgerAccounts,
    eventKeys,
    disbursementSummary,
    recentDisbursements,
    canManage,
}: Props) {
    const bankForm = useForm({
        branch_id: selectedBranch?.id ?? '',
        bank_name: '',
        branch_name: '',
        account_number: '',
        account_title: '',
        ledger_account_id: '',
        ledger_code: '',
        is_default: bankAccounts.length === 0,
    });

    const defaultForm = useForm({
        branch_id: selectedBranch?.id ?? '',
        event_key: 'cash_in_hand',
        ledger_account_id: '',
    });

    const cashSummary = disbursementSummary.find((r) => r.payment_mode === 'cash');
    const bankSummaries = disbursementSummary.filter((r) => r.payment_mode === 'bank');
    const totalBankPaisa = bankSummaries.reduce((acc, r) => acc + Number(r.total_paisa || 0), 0);
    const totalBankCount = bankSummaries.reduce((acc, r) => acc + Number(r.tx_count || 0), 0);

    const switchBranch = (branchId: number | null) => {
        if (!branchId) return;
        router.get('/head-office/branch-account-setup', { branch_id: branchId }, { preserveState: false });
    };

    const assetAccounts = ledgerAccounts.filter((a) => a.type === 'asset');

    return (
        <AdminLayout>
            <Head title="Branch Account & Bank Setup" />

            <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
                {/* Header & Branch Selector */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Branch Account & Bank Setup</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            প্রতিটি শাখার জন্য আলাদা ব্যাংক অ্যাকাউন্ট, Cash/Bank GL ম্যাপিং এবং ডিসবার্সমেন্ট ট্র্যাকিং কনফিগার করুন।
                        </p>
                    </div>
                    <div className="w-72">
                        <ComboSelect
                            size="sm"
                            clearable={false}
                            value={selectedBranch?.id ?? null}
                            onChange={(val) => switchBranch(val ? Number(val) : null)}
                            items={branches.map((b) => ({
                                value: b.id,
                                label: `${b.code} — ${b.name}${b.accounting_enabled ? '' : ' (AIS Off)'}`,
                            }))}
                            placeholder="শাখা নির্বাচন করুন"
                        />
                    </div>
                </div>

                {selectedBranch && (
                    <>
                        {/* 3-Step Simple Setup Guide */}
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-slate-700">
                            <div className="font-bold text-blue-950">সহজ সেটআপ গাইড (৩ ধাপে শাখা চালু করুন):</div>
                            <div className="mt-2 grid gap-2 md:grid-cols-3">
                                <div className="rounded-xl bg-white/90 p-3 border border-blue-100">
                                    <span className="font-bold text-blue-700">ধাপ ১:</span> Accounting Periods-এ গিয়ে শাখার <strong>Accounting Mode ON</strong> ও <strong>Day Initial</strong> সেট করুন।
                                </div>
                                <div className="rounded-xl bg-white/90 p-3 border border-blue-100">
                                    <span className="font-bold text-blue-700">ধাপ ২:</span> নিচে শাখার <strong>Bank Account</strong> যোগ করুন (প্রয়োজনে Branch GL Override-এ Cash অ্যাকাউন্ট দিন)।
                                </div>
                                <div className="rounded-xl bg-white/90 p-3 border border-blue-100">
                                    <span className="font-bold text-blue-700">ধাপ ৩:</span> <Link href="/loan-ledger" className="font-bold text-brand underline">Loan Ledger</Link> থেকে Disburse করার সময় <strong>Cash</strong> বা নির্দিষ্ট <strong>Bank</strong> সিলেক্ট করুন।
                                </div>
                            </div>
                        </div>

                        {/* Branch Setup Checklist */}
                        <div className="grid gap-3 md:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">১. Accounting Mode</span>
                                    {selectedBranch.accounting_enabled ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-amber-500" />
                                    )}
                                </div>
                                <div className="mt-2 text-sm font-bold text-slate-900">
                                    {selectedBranch.accounting_enabled ? 'চালু (Pilot ON)' : 'বন্ধ (Legacy MIS)'}
                                </div>
                                <Link href="/head-office/accounting-periods" className="mt-1 inline-block text-[11px] font-semibold text-brand hover:underline">
                                    Periods-এ পরিবর্তন করুন →
                                </Link>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">২. Financial Year & Day</span>
                                    {enrollment && dayState?.has_open_day ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-amber-500" />
                                    )}
                                </div>
                                <div className="mt-2 text-sm font-bold text-slate-900">
                                    {enrollment?.financial_year?.name ?? 'FY সেট নেই'}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                    Open Day: {dayState?.has_open_day ? dayState.business_date : 'দিন খোলা নেই'}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">৩. Cash Disbursement</span>
                                    <Wallet className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div className="mt-2 text-sm font-bold text-slate-900">
                                    {fmt(cashSummary?.total_paisa ?? 0)}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                    {cashSummary?.tx_count ?? 0} টি Cash বিতরণ
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-500">৪. Bank Disbursement</span>
                                    <Landmark className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="mt-2 text-sm font-bold text-slate-900">
                                    {fmt(totalBankPaisa)}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                    {totalBankCount} টি Bank বিতরণ ({bankAccounts.length} টি ব্যাংক)
                                </div>
                            </div>
                        </div>

                        {/* Branch Bank Accounts */}
                        <div className="grid gap-5 lg:grid-cols-12">
                            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
                                <div className="flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                        <Landmark className="h-4 w-4 text-brand" />
                                        {selectedBranch.name} — ব্যাংক অ্যাকাউন্ট তালিকা
                                    </h2>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-slate-500">
                                                <th className="py-2">ব্যাংক ও শাখা</th>
                                                <th className="py-2">অ্যাকাউন্ট নং</th>
                                                <th className="py-2">GL Ledger</th>
                                                <th className="py-2">স্ট্যাটাস</th>
                                                {canManage && <th className="py-2 text-right">Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bankAccounts.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-6 text-center text-slate-400">
                                                        এই শাখার কোনো আলাদা ব্যাংক অ্যাকাউন্ট যোগ করা হয়নি (ডিফল্ট Global `1020 - Cash at Bank` ব্যবহৃত হচ্ছে)।
                                                    </td>
                                                </tr>
                                            ) : (
                                                bankAccounts.map((bank) => (
                                                    <tr key={bank.id} className="border-b border-slate-50">
                                                        <td className="py-2.5">
                                                            <div className="font-bold text-slate-900">{bank.bank_name}</div>
                                                            {bank.branch_name && <div className="text-[11px] text-slate-500">{bank.branch_name}</div>}
                                                        </td>
                                                        <td className="py-2.5 font-mono text-[11px]">{bank.account_number}</td>
                                                        <td className="py-2.5">
                                                            {bank.ledger_account ? (
                                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
                                                                    {bank.ledger_account.code} — {bank.ledger_account.name}
                                                                </span>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                        <td className="py-2.5">
                                                            <div className="flex flex-wrap gap-1">
                                                                {bank.is_default && (
                                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                                                        Default
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                                        bank.is_active ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                                                                    }`}
                                                                >
                                                                    {bank.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        {canManage && (
                                                            <td className="py-2.5 text-right space-x-2">
                                                                {!bank.is_default && bank.is_active && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            router.patch(`/head-office/branch-account-setup/bank-accounts/${bank.id}/default`)
                                                                        }
                                                                        className="text-[11px] font-semibold text-brand hover:underline"
                                                                    >
                                                                        Set Default
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        router.patch(`/head-office/branch-account-setup/bank-accounts/${bank.id}/toggle`)
                                                                    }
                                                                    className="text-[11px] font-semibold text-slate-600 hover:underline"
                                                                >
                                                                    {bank.is_active ? 'Disable' : 'Enable'}
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Add Bank Account Form */}
                            {canManage && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        bankForm.post('/head-office/branch-account-setup/bank-accounts', {
                                            onSuccess: () => {
                                                bankForm.reset('bank_name', 'branch_name', 'account_number', 'account_title', 'ledger_account_id', 'ledger_code');
                                            },
                                        });
                                    }}
                                    className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5"
                                >
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                        <PlusCircle className="h-4 w-4 text-brand" />
                                        নতুন ব্যাংক অ্যাকাউন্ট যোগ করুন
                                    </h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-700">ব্যাংকের নাম *</label>
                                            <input
                                                type="text"
                                                value={bankForm.data.bank_name}
                                                onChange={(e) => bankForm.setData('bank_name', e.target.value)}
                                                placeholder="যেমন: Sonali Bank PLC"
                                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-700">ব্যাংক শাখা</label>
                                            <input
                                                type="text"
                                                value={bankForm.data.branch_name}
                                                onChange={(e) => bankForm.setData('branch_name', e.target.value)}
                                                placeholder="যেমন: Mirpur-10 Branch"
                                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-700">অ্যাকাউন্ট নম্বর *</label>
                                            <input
                                                type="text"
                                                value={bankForm.data.account_number}
                                                onChange={(e) => bankForm.setData('account_number', e.target.value)}
                                                placeholder="যেমন: 0123456789"
                                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-semibold text-slate-700">অ্যাকাউন্ট শিরোনাম</label>
                                            <input
                                                type="text"
                                                value={bankForm.data.account_title}
                                                onChange={(e) => bankForm.setData('account_title', e.target.value)}
                                                placeholder="যেমন: Mousumi Microcredit"
                                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                                GL Ledger Account (খালি রাখলে অটো তৈরি হবে)
                                            </label>
                                            <ComboSelect
                                                size="sm"
                                                value={bankForm.data.ledger_account_id ? Number(bankForm.data.ledger_account_id) : null}
                                                onChange={(val) => bankForm.setData('ledger_account_id', val ? String(val) : '')}
                                                items={assetAccounts.map((a) => ({
                                                    value: a.id,
                                                    label: `${a.code} — ${a.name}`,
                                                }))}
                                                placeholder="অটো নতুন লেজার তৈরি করুন অথবা নির্বাচন করুন"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 flex items-center gap-2">
                                            <input
                                                id="is_default_bank"
                                                type="checkbox"
                                                checked={bankForm.data.is_default}
                                                onChange={(e) => bankForm.setData('is_default', e.target.checked)}
                                                className="rounded border-slate-300"
                                            />
                                            <label htmlFor="is_default_bank" className="text-xs font-medium text-slate-700">
                                                এই শাখার Default Bank হিসেবে সেট করুন
                                            </label>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={bankForm.processing}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        ব্যাংক যুক্ত করুন
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Branch GL Posting Overrides */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                            <div>
                                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                    <Building2 className="h-4 w-4 text-brand" />
                                    {selectedBranch.name} — Branch GL Posting Overrides
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    শাখাভিত্তিক Cash in Hand বা অন্যান্য অ্যাকাউন্ট Global Default থেকে আলাদা করতে চাইলে এখানে সেট করুন।
                                </p>
                            </div>

                            {canManage && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        defaultForm.post('/head-office/branch-account-setup/posting-defaults');
                                    }}
                                    className="grid items-end gap-3 md:grid-cols-3"
                                >
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">Accounting Event</label>
                                        <ComboSelect
                                            size="sm"
                                            clearable={false}
                                            value={defaultForm.data.event_key}
                                            onChange={(val) => defaultForm.setData('event_key', val ?? 'cash_in_hand')}
                                            items={Object.entries(eventKeys).map(([k, label]) => ({ value: k, label }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">Ledger Account</label>
                                        <ComboSelect
                                            size="sm"
                                            value={defaultForm.data.ledger_account_id ? Number(defaultForm.data.ledger_account_id) : null}
                                            onChange={(val) => defaultForm.setData('ledger_account_id', val ? String(val) : '')}
                                            items={ledgerAccounts.map((a) => ({
                                                value: a.id,
                                                label: `${a.code} — ${a.name} (${a.type})`,
                                            }))}
                                            placeholder="লেজার নির্বাচন করুন"
                                        />
                                    </div>
                                    <div>
                                        <button
                                            type="submit"
                                            disabled={defaultForm.processing || !defaultForm.data.ledger_account_id}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                                        >
                                            <Save className="h-3.5 w-3.5" />
                                            Override সেভ করুন
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">Event</th>
                                            <th className="py-2">Branch Override</th>
                                            <th className="py-2">Global Default</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(eventKeys).map(([key, label]) => {
                                            const branchRow = branchDefaults.find((d) => d.event_key === key);
                                            const globalRow = globalDefaults.find((d) => d.event_key === key);
                                            return (
                                                <tr key={key} className="border-b border-slate-50">
                                                    <td className="py-2 font-medium text-slate-800">{label}</td>
                                                    <td className="py-2">
                                                        {branchRow?.ledger_account ? (
                                                            <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                                                                {branchRow.ledger_account.code} — {branchRow.ledger_account.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">Global ব্যবহৃত হচ্ছে</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 font-mono text-[11px] text-slate-600">
                                                        {globalRow?.ledger_account
                                                            ? `${globalRow.ledger_account.code} — ${globalRow.ledger_account.name}`
                                                            : 'সেট নেই'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Branch Disbursements */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <Banknote className="h-4 w-4 text-brand" />
                                {selectedBranch.name} — সাম্প্রতিক Disbursement (Cash vs Bank)
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">তারিখ</th>
                                            <th className="py-2">অ্যাকাউন্ট</th>
                                            <th className="py-2">মাধ্যম (Cash / Bank)</th>
                                            <th className="py-2">ব্যাংক ও রেফারেন্স</th>
                                            <th className="py-2">পরিমাণ</th>
                                            <th className="py-2">বিতরণকারী</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentDisbursements.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-slate-400">
                                                    এই শাখায় এখনো কোনো Loan Ledger ডিসবার্সমেন্ট রেকর্ড নেই।
                                                </td>
                                            </tr>
                                        ) : (
                                            recentDisbursements.map((tx) => (
                                                <tr key={tx.id} className="border-b border-slate-50">
                                                    <td className="py-2 font-semibold">{tx.business_date}</td>
                                                    <td className="py-2 font-bold">{tx.loan_account?.account_no}</td>
                                                    <td className="py-2">
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                                                tx.payment_mode === 'bank'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : 'bg-emerald-100 text-emerald-800'
                                                            }`}
                                                        >
                                                            {tx.payment_mode}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 text-slate-600">
                                                        {tx.payment_mode === 'bank'
                                                            ? `${tx.branch_bank_account ? `${tx.branch_bank_account.bank_name} (${tx.branch_bank_account.account_number})` : 'Default Bank'}${tx.bank_reference ? ` • Ref: ${tx.bank_reference}` : ''}`
                                                            : 'Cash in Hand'}
                                                    </td>
                                                    <td className="py-2 font-bold">{fmt(tx.total_paisa)}</td>
                                                    <td className="py-2 text-slate-500">{tx.creator?.name ?? '—'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
