import { Head, Link, router, useForm } from '@inertiajs/react';
import { Banknote, BookOpen, CheckCircle2, ClipboardList, PlusCircle, Printer, RotateCcw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ComboSelect } from '@/components/ComboSelect';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface Branch {
    id: number;
    name: string;
    code: string;
}

interface DayState {
    has_open_day: boolean;
    business_date: string | null;
}

interface LoanInstallment {
    id: number;
    installment_no: number;
    due_date: string;
    principal_due_paisa: number;
    service_charge_due_paisa: number;
    principal_paid_paisa: number;
    service_charge_paid_paisa: number;
    status: string;
}

interface LoanAccount {
    id: number;
    account_no: string;
    pricing_method: string;
    installment_frequency: string;
    installment_count: number;
    principal_paisa: number;
    service_charge_paisa: number;
    principal_paid_paisa: number;
    service_charge_paid_paisa: number;
    disbursed_date: string;
    status: string;
    member_admission?: { id: number; applicant_name_bn: string | null; applicant_name_en: string | null; member_code: string | null } | null;
    loan_product?: { id: number; product_name: string; product_code: string | null } | null;
    installments: LoanInstallment[];
}

interface LoanTx {
    id: number;
    kind: string;
    business_date: string;
    principal_paisa: number;
    service_charge_paisa: number;
    total_paisa: number;
    payment_mode: string;
    bank_reference?: string | null;
    branch_bank_account?: { id: number; bank_name: string; account_number: string } | null;
    loan_account?: { id: number; account_no: string } | null;
    creator?: { id: number; name: string } | null;
}

interface BranchBankAccountItem {
    id: number;
    bank_name: string;
    branch_name?: string | null;
    account_number: string;
    is_default: boolean;
}

interface CorrectionReq {
    id: number;
    reason: string;
    status: string;
    requested_by: number;
    transaction?: { id: number; total_paisa: number; loan_account?: { id: number; account_no: string } | null } | null;
    requester?: { id: number; name: string } | null;
}

interface MemberItem {
    id: number;
    applicant_name_bn: string | null;
    applicant_name_en: string | null;
    member_code: string | null;
}

interface SamityItem {
    id: number;
    name: string;
    code: string | null;
}

interface DcsRow {
    loan_account_id: number;
    account_no: string;
    samity_id: number | null;
    samity_name: string;
    member_id: number;
    member_code: string;
    member_name: string;
    regular_due_paisa: number;
    overdue_paisa: number;
    total_due_paisa: number;
    remaining_balance_paisa: number;
    savings_account_id: number | null;
    savings_account_no: string | null;
    savings_balance_paisa: number;
}

interface ProductItem {
    id: number;
    name: string;
    code: string | null;
    interest_rate: number | null;
    installment_type: string | null;
    number_of_installments: number | null;
}

interface Props {
    branch: Branch | null;
    branches: Branch[];
    canSelectBranch: boolean;
    dayState: DayState | null;
    accounts: LoanAccount[];
    transactions: LoanTx[];
    bankAccounts: BranchBankAccountItem[];
    corrections: CorrectionReq[];
    members: MemberItem[];
    samities: SamityItem[];
    dcsSamityId: number | null;
    dcsRows: DcsRow[];
    loanProducts: ProductItem[];
    currentUserId: number;
    canOperate: boolean;
}

const fmt = (paisa: number): string =>
    `৳${(paisa / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function LoanLedgerIndex({
    branch,
    branches,
    canSelectBranch,
    dayState,
    accounts,
    transactions,
    bankAccounts,
    corrections,
    members,
    samities,
    dcsSamityId,
    dcsRows,
    loanProducts,
    currentUserId,
    canOperate,
}: Props) {
    const [tab, setTab] = useState<'dcs' | 'accounts' | 'disburse' | 'transactions' | 'corrections'>('dcs');
    const [txModeFilter, setTxModeFilter] = useState<'all' | 'cash' | 'bank'>('all');
    const [selectedAccount, setSelectedAccount] = useState<LoanAccount | null>(accounts[0] ?? null);
    const [collectAmounts, setCollectAmounts] = useState<Record<number, string>>({});
    const [rebateAmounts, setRebateAmounts] = useState<Record<number, string>>({});
    const [dcsInputs, setDcsInputs] = useState<Record<number, { loan: string; savings: string }>>({});

    useEffect(() => {
        const init: Record<number, { loan: string; savings: string }> = {};
        for (const r of dcsRows) {
            init[r.loan_account_id] = {
                loan: r.total_due_paisa > 0 ? (r.total_due_paisa / 100).toFixed(2) : '',
                savings: '',
            };
        }
        setDcsInputs(init);
    }, [dcsRows]);

    const defaultBankId = bankAccounts.find((b) => b.is_default)?.id ?? bankAccounts[0]?.id ?? '';

    const disburseForm = useForm({
        branch_id: branch?.id ?? '',
        member_admission_id: '',
        loan_product_id: '',
        principal_amount: '',
        annual_rate: '24',
        installment_count: '45',
        pricing_method: 'flat',
        installment_frequency: 'weekly',
        disbursed_date: dayState?.business_date ?? new Date().toISOString().slice(0, 10),
        first_due_date: dayState?.business_date ?? new Date().toISOString().slice(0, 10),
        payment_mode: 'cash',
        branch_bank_account_id: defaultBankId ? String(defaultBankId) : '',
        bank_reference: '',
    });

    const bDate = dayState?.business_date ?? new Date().toISOString().slice(0, 10);

    const handleBulkDcsSubmit = () => {
        const rows = dcsRows.map((r) => ({
            loan_account_id: r.loan_account_id,
            loan_amount: dcsInputs[r.loan_account_id]?.loan || '0',
            savings_account_id: r.savings_account_id,
            savings_amount: dcsInputs[r.loan_account_id]?.savings || '0',
        }));
        router.post('/loan-ledger/bulk-dcs', {
            branch_id: branch?.id,
            business_date: bDate,
            payment_mode: 'cash',
            rows,
        });
    };

    return (
        <AdminLayout>
            <Head title="Loan Ledger & Daily Collection" />

            <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Loan Ledger, Schedule & Daily Collection Sheet (DCS)</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {branch ? `শাখা: ${branch.name} (${branch.code})` : 'শাখা নির্ধারিত নেই'}
                            {dayState?.has_open_day && ` • Open Date: ${formatDate(dayState.business_date)}`}
                        </p>
                    </div>
                    {canSelectBranch && branches.length > 0 && (
                        <div className="w-60">
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={branch?.id ?? null}
                                onChange={(val) => val && router.get('/loan-ledger', { branch_id: val }, { preserveState: false })}
                                items={branches.map((b) => ({
                                    value: b.id,
                                    label: `${b.name} (${b.code})`,
                                    keywords: `${b.name} ${b.code}`,
                                }))}
                            />
                        </div>
                    )}
                </div>

                <div className="print:hidden flex flex-wrap gap-2">
                    {[
                        { id: 'dcs', label: 'Daily Collection Sheet (DCS)', icon: ClipboardList },
                        { id: 'accounts', label: 'Loan Accounts & Rebate', icon: Banknote },
                        { id: 'disburse', label: 'New Loan Disbursement', icon: PlusCircle },
                        { id: 'transactions', label: 'Collection Register', icon: CheckCircle2 },
                        { id: 'corrections', label: 'Receipt Corrections', icon: RotateCcw },
                    ].map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id as typeof tab)}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold ${
                                    active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-700'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {tab === 'dcs' && (
                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-sm font-bold text-slate-900">
                                    সমিতি-ভিত্তিক Daily Collection Sheet ({formatDate(bDate)})
                                </h2>
                                <div className="w-64 print:hidden">
                                    <ComboSelect
                                        size="sm"
                                        value={dcsSamityId}
                                        onChange={(val) =>
                                            router.get(
                                                '/loan-ledger',
                                                { branch_id: branch?.id, samity_id: val || undefined },
                                                { preserveState: true },
                                            )
                                        }
                                        items={samities.map((s) => ({
                                            value: s.id,
                                            label: s.code ? `${s.code} — ${s.name}` : s.name,
                                        }))}
                                        placeholder="সকল সমিতি (All Samities)"
                                    />
                                </div>
                            </div>
                            <div className="print:hidden flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    Print DCS
                                </button>
                                {canOperate && dayState?.has_open_day && dcsRows.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleBulkDcsSubmit}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Post Bulk Collection
                                    </button>
                                )}
                            </div>
                        </div>

                        {!dayState?.has_open_day ? (
                            <p className="py-6 text-center text-xs text-amber-700">
                                DCS কালেকশন করতে আগে Branch Work Process থেকে আজকের দিন ওপেন (Day Open) করুন।
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">সমিতি ও সদস্য</th>
                                            <th className="py-2">লোন অ্যাকাউন্ট</th>
                                            <th className="py-2">আজকের কিস্তি</th>
                                            <th className="py-2">বকেয়া (Overdue)</th>
                                            <th className="py-2">আদায় (লোন ৳)</th>
                                            <th className="py-2">সঞ্চয় জমা (৳)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dcsRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-slate-400">
                                                    এই শাখা/সমিতিতে কোনো সক্রিয় ঋণ পাওয়া যায়নি
                                                </td>
                                            </tr>
                                        ) : (
                                            dcsRows.map((row) => (
                                                <tr key={row.loan_account_id} className="border-b border-slate-50">
                                                    <td className="py-2">
                                                        <div className="font-bold text-slate-800">{row.member_name} ({row.member_code})</div>
                                                        <div className="text-[11px] text-slate-500">{row.samity_name}</div>
                                                    </td>
                                                    <td className="py-2 font-semibold">{row.account_no}</td>
                                                    <td className="py-2">{fmt(row.regular_due_paisa)}</td>
                                                    <td className="py-2 font-bold text-rose-600">{fmt(row.overdue_paisa)}</td>
                                                    <td className="py-2">
                                                        <input
                                                            type="text"
                                                            value={dcsInputs[row.loan_account_id]?.loan ?? ''}
                                                            onChange={(e) =>
                                                                setDcsInputs((prev) => ({
                                                                    ...prev,
                                                                    [row.loan_account_id]: {
                                                                        loan: e.target.value,
                                                                        savings: prev[row.loan_account_id]?.savings ?? '',
                                                                    },
                                                                }))
                                                            }
                                                            placeholder="0.00"
                                                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                                        />
                                                    </td>
                                                    <td className="py-2">
                                                        {row.savings_account_id ? (
                                                            <input
                                                                type="text"
                                                                value={dcsInputs[row.loan_account_id]?.savings ?? ''}
                                                                onChange={(e) =>
                                                                    setDcsInputs((prev) => ({
                                                                        ...prev,
                                                                        [row.loan_account_id]: {
                                                                            loan: prev[row.loan_account_id]?.loan ?? '',
                                                                            savings: e.target.value,
                                                                        },
                                                                    }))
                                                                }
                                                                placeholder="0.00"
                                                                className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400">No Savings</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'accounts' && (
                    <div className="grid gap-5 lg:grid-cols-12">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-7">
                            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                                Loan Accounts ({accounts.length})
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-2">Account & Member</th>
                                            <th className="py-2">Remaining</th>
                                            <th className="py-2">Collect / Settle</th>
                                            <th className="py-2">Passbook</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accounts.map((acc) => {
                                            const totalDue = acc.principal_paisa + acc.service_charge_paisa;
                                            const remaining = totalDue - (acc.principal_paid_paisa + acc.service_charge_paid_paisa);
                                            return (
                                                <tr
                                                    key={acc.id}
                                                    onClick={() => setSelectedAccount(acc)}
                                                    className={`cursor-pointer border-b border-slate-50 ${
                                                        selectedAccount?.id === acc.id ? 'bg-brand/5' : ''
                                                    }`}
                                                >
                                                    <td className="py-2.5">
                                                        <div className="font-bold text-slate-800">{acc.account_no}</div>
                                                        <div className="text-[11px] text-slate-500">
                                                            {acc.member_admission?.applicant_name_bn || acc.member_admission?.applicant_name_en} ({acc.member_admission?.member_code})
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 font-bold text-slate-800">{fmt(remaining)}</td>
                                                    <td className="py-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                                        {acc.status === 'active' && canOperate ? (
                                                            <>
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="text"
                                                                        value={collectAmounts[acc.id] ?? ''}
                                                                        onChange={(e) =>
                                                                            setCollectAmounts((prev) => ({ ...prev, [acc.id]: e.target.value }))
                                                                        }
                                                                        placeholder="Collect ৳"
                                                                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const amt = collectAmounts[acc.id];
                                                                            if (amt) {
                                                                                router.post(`/loan-ledger/${acc.id}/collect`, {
                                                                                    business_date: bDate,
                                                                                    amount: amt,
                                                                                    payment_mode: 'cash',
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white"
                                                                    >
                                                                        Collect
                                                                    </button>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="text"
                                                                        value={rebateAmounts[acc.id] ?? ''}
                                                                        onChange={(e) =>
                                                                            setRebateAmounts((prev) => ({ ...prev, [acc.id]: e.target.value }))
                                                                        }
                                                                        placeholder="Rebate ৳"
                                                                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            router.post(`/loan-ledger/${acc.id}/settle-early`, {
                                                                                business_date: bDate,
                                                                                rebate_amount: rebateAmounts[acc.id] || '0',
                                                                                payment_mode: 'cash',
                                                                            })
                                                                        }
                                                                        className="rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-bold text-white"
                                                                    >
                                                                        Settle
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                                                                {acc.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                                                        <Link
                                                            href={`/loan-ledger/${acc.id}/passbook`}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                                                        >
                                                            <BookOpen className="h-3.5 w-3.5" />
                                                            Passbook
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-5">
                            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                                Installment Schedule {selectedAccount ? `(${selectedAccount.account_no})` : ''}
                            </h2>
                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-500">
                                            <th className="py-1.5">#</th>
                                            <th className="py-1.5">Due Date</th>
                                            <th className="py-1.5">Principal</th>
                                            <th className="py-1.5">S.Charge</th>
                                            <th className="py-1.5">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedAccount?.installments ?? []).map((inst) => (
                                            <tr key={inst.id} className="border-b border-slate-50">
                                                <td className="py-1.5 font-semibold">{inst.installment_no}</td>
                                                <td className="py-1.5">{formatDate(inst.due_date)}</td>
                                                <td className="py-1.5">{fmt(inst.principal_due_paisa)}</td>
                                                <td className="py-1.5">{fmt(inst.service_charge_due_paisa)}</td>
                                                <td className="py-1.5 uppercase font-bold text-slate-600">{inst.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'disburse' && canOperate && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            disburseForm.post('/loan-ledger/disburse', {
                                onSuccess: () => setTab('accounts'),
                            });
                        }}
                        className="grid max-w-3xl gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs md:grid-cols-2"
                    >
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Member</label>
                            <ComboSelect
                                size="sm"
                                value={disburseForm.data.member_admission_id ? Number(disburseForm.data.member_admission_id) : null}
                                onChange={(val) => disburseForm.setData('member_admission_id', val ? String(val) : '')}
                                items={members.map((m) => ({
                                    value: m.id,
                                    label: `${m.member_code ?? ''} — ${m.applicant_name_bn || m.applicant_name_en}`,
                                }))}
                                placeholder="সদস্য নির্বাচন করুন"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Loan Product</label>
                            <ComboSelect
                                size="sm"
                                value={disburseForm.data.loan_product_id ? Number(disburseForm.data.loan_product_id) : null}
                                onChange={(val) => disburseForm.setData('loan_product_id', val ? String(val) : '')}
                                items={loanProducts.map((p) => ({ value: p.id, label: p.code ? `${p.code} — ${p.name}` : p.name }))}
                                placeholder="প্রোডাক্ট নির্বাচন করুন"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Principal Amount (৳)</label>
                            <input
                                type="text"
                                value={disburseForm.data.principal_amount}
                                onChange={(e) => disburseForm.setData('principal_amount', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Annual Rate (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={disburseForm.data.annual_rate}
                                onChange={(e) => disburseForm.setData('annual_rate', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Pricing Method</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={disburseForm.data.pricing_method}
                                onChange={(val) => disburseForm.setData('pricing_method', val ?? 'flat')}
                                items={[
                                    { value: 'flat', label: 'Flat Rate' },
                                    { value: 'declining', label: 'Declining Balance' },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Frequency</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={disburseForm.data.installment_frequency}
                                onChange={(val) => disburseForm.setData('installment_frequency', val ?? 'weekly')}
                                items={[
                                    { value: 'weekly', label: 'Weekly' },
                                    { value: 'monthly', label: 'Monthly' },
                                ]}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Installments Count</label>
                            <input
                                type="number"
                                value={disburseForm.data.installment_count}
                                onChange={(e) => disburseForm.setData('installment_count', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">First Due Date</label>
                            <input
                                type="date"
                                value={disburseForm.data.first_due_date}
                                onChange={(e) => disburseForm.setData('first_due_date', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Mode (Cash / Bank)</label>
                            <ComboSelect
                                size="sm"
                                clearable={false}
                                value={disburseForm.data.payment_mode}
                                onChange={(val) => disburseForm.setData('payment_mode', val ?? 'cash')}
                                items={[
                                    { value: 'cash', label: 'Cash in Hand (নগদ)' },
                                    { value: 'bank', label: 'Bank (ব্যাংক)' },
                                ]}
                            />
                        </div>
                        {disburseForm.data.payment_mode === 'bank' && (
                            <>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Branch Bank Account</label>
                                    <ComboSelect
                                        size="sm"
                                        value={disburseForm.data.branch_bank_account_id ? Number(disburseForm.data.branch_bank_account_id) : null}
                                        onChange={(val) => disburseForm.setData('branch_bank_account_id', val ? String(val) : '')}
                                        items={bankAccounts.map((b) => ({
                                            value: b.id,
                                            label: `${b.bank_name} (${b.account_number})${b.is_default ? ' [Default]' : ''}`,
                                        }))}
                                        placeholder={bankAccounts.length > 0 ? 'ব্যাংক নির্বাচন করুন' : 'Global Default Bank ব্যবহৃত হবে'}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Cheque / Bank Ref No.</label>
                                    <input
                                        type="text"
                                        value={disburseForm.data.bank_reference}
                                        onChange={(e) => disburseForm.setData('bank_reference', e.target.value)}
                                        placeholder="ঐচ্ছিক (চেক বা ট্রান্সফার নং)"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                                    />
                                </div>
                            </>
                        )}
                        <div className="md:col-span-2">
                            <button type="submit" disabled={disburseForm.processing} className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white">
                                Disburse & Generate Schedule
                            </button>
                        </div>
                    </form>
                )}

                {tab === 'transactions' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                        <div className="flex items-center gap-2">
                            {(['all', 'cash', 'bank'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setTxModeFilter(mode)}
                                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                                        txModeFilter === mode
                                            ? 'bg-brand text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {mode === 'all' ? 'All' : mode}
                                </button>
                            ))}
                        </div>
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500">
                                    <th className="py-2">তারিখ</th>
                                    <th className="py-2">অ্যাকাউন্ট</th>
                                    <th className="py-2">ধরন</th>
                                    <th className="py-2">মাধ্যম (Cash / Bank)</th>
                                    <th className="py-2">Principal / S.Charge</th>
                                    <th className="py-2">Total</th>
                                    <th className="py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions
                                    .filter((tx) => txModeFilter === 'all' || tx.payment_mode === txModeFilter)
                                    .map((tx) => (
                                    <tr key={tx.id} className="border-b border-slate-50">
                                        <td className="py-2 font-semibold">{formatDate(tx.business_date)}</td>
                                        <td className="py-2 font-bold">{tx.loan_account?.account_no}</td>
                                        <td className="py-2 uppercase">{tx.kind}</td>
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
                                            {tx.payment_mode === 'bank' && tx.branch_bank_account && (
                                                <div className="mt-0.5 text-[10px] text-slate-500">
                                                    {tx.branch_bank_account.bank_name} ({tx.branch_bank_account.account_number})
                                                    {tx.bank_reference ? ` • ${tx.bank_reference}` : ''}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-2">{fmt(tx.principal_paisa)} / {fmt(tx.service_charge_paisa)}</td>
                                        <td className="py-2 font-bold">{fmt(tx.total_paisa)}</td>
                                        <td className="py-2 flex items-center gap-2.5">
                                            <Link
                                                href={`/loan-ledger/transactions/${tx.id}/receipt`}
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                                            >
                                                <Printer className="h-3 w-3" />
                                                Receipt
                                            </Link>
                                            {tx.kind === 'collection' && canOperate && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.post(`/loan-ledger/transactions/${tx.id}/correction`, {
                                                            reason: 'Receipt entry correction requested',
                                                        })
                                                    }
                                                    className="text-[11px] font-semibold text-amber-700 hover:underline"
                                                >
                                                    Request Reversal
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'corrections' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500">
                                    <th className="py-2">Account</th>
                                    <th className="py-2">Amount</th>
                                    <th className="py-2">Reason</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {corrections.map((c) => (
                                    <tr key={c.id} className="border-b border-slate-50">
                                        <td className="py-2 font-bold">{c.transaction?.loan_account?.account_no}</td>
                                        <td className="py-2">{fmt(c.transaction?.total_paisa ?? 0)}</td>
                                        <td className="py-2">{c.reason}</td>
                                        <td className="py-2 uppercase font-bold">{c.status}</td>
                                        <td className="py-2">
                                            {c.status === 'pending' && canOperate && c.requested_by !== currentUserId && (
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.post(`/loan-ledger/corrections/${c.id}/review`, {
                                                                approve: true,
                                                                business_date: bDate,
                                                            })
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Approve
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.post(`/loan-ledger/corrections/${c.id}/review`, {
                                                                approve: false,
                                                                business_date: bDate,
                                                            })
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white"
                                                    >
                                                        <XCircle className="h-3 w-3" />
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
