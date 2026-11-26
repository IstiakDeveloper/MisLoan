import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface Props {
    account: {
        id: number;
        account_no: string;
        disbursed_date: string;
        principal_paisa: number;
        service_charge_paisa: number;
        principal_paid_paisa: number;
        service_charge_paid_paisa: number;
        status: string;
        branch?: { name: string; code: string } | null;
        samity?: { samity_name: string; samity_code?: string } | null;
        member_admission?: { applicant_name_bn?: string; applicant_name_en?: string; member_code?: string; mobile_number?: string } | null;
        loan_product?: { product_name: string } | null;
        installments: Array<{
            id: number;
            installment_no: number;
            due_date: string;
            principal_due_paisa: number;
            service_charge_due_paisa: number;
            principal_paid_paisa: number;
            service_charge_paid_paisa: number;
            status: string;
        }>;
        transactions: Array<{
            id: number;
            reference: string;
            kind: string;
            business_date: string;
            principal_paisa: number;
            service_charge_paisa: number;
            total_paisa: number;
            creator?: { name: string } | null;
        }>;
    };
}

const fmt = (p: number) => `৳${(p / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function LoanPassbook({ account }: Props) {
    const remaining = account.principal_paisa + account.service_charge_paisa - (account.principal_paid_paisa + account.service_charge_paid_paisa);

    return (
        <AdminLayout>
            <Head title={`Passbook - ${account.account_no}`} />
            <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 print:border-none">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">সদস্য ঋণ পাসবুক (Loan Passbook)</h1>
                        <p className="text-xs text-slate-500">
                            Account: <b>{account.account_no}</b> • শাখা: {account.branch?.name} ({account.branch?.code})
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                            সদস্য: {account.member_admission?.applicant_name_bn || account.member_admission?.applicant_name_en} ({account.member_admission?.member_code}) • সমিতি: {account.samity?.samity_name ?? '-'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="print:hidden inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white"
                    >
                        <Printer className="h-3.5 w-3.5" />
                        Print Passbook
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                        <div className="text-slate-500">বিতরণের তারিখ</div>
                        <div className="font-bold">{formatDate(account.disbursed_date)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                        <div className="text-slate-500">আসল + সার্ভিস চার্জ</div>
                        <div className="font-bold">{fmt(account.principal_paisa + account.service_charge_paisa)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                        <div className="text-slate-500">মোট আদায়</div>
                        <div className="font-bold text-emerald-700">{fmt(account.principal_paid_paisa + account.service_charge_paid_paisa)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                        <div className="text-slate-500">অবশিষ্ট বকেয়া</div>
                        <div className="font-bold text-rose-700">{fmt(remaining)}</div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="mb-2 text-xs font-bold uppercase text-slate-600">লেনদেন লেজার (Transactions)</h2>
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-500">
                                <th className="py-1.5">তারিখ</th>
                                <th className="py-1.5">ধরন</th>
                                <th className="py-1.5">আসল</th>
                                <th className="py-1.5">সার্ভিস চার্জ</th>
                                <th className="py-1.5">মোট</th>
                                <th className="py-1.5">সংগ্রহকারী</th>
                            </tr>
                        </thead>
                        <tbody>
                            {account.transactions.map((t) => (
                                <tr key={t.id} className="border-b border-slate-50">
                                    <td className="py-1.5">{formatDate(t.business_date)}</td>
                                    <td className="py-1.5 uppercase">{t.kind}</td>
                                    <td className="py-1.5">{fmt(t.principal_paisa)}</td>
                                    <td className="py-1.5">{fmt(t.service_charge_paisa)}</td>
                                    <td className="py-1.5 font-bold">{fmt(t.total_paisa)}</td>
                                    <td className="py-1.5">{t.creator?.name ?? '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h2 className="mb-2 text-xs font-bold uppercase text-slate-600">কিস্তি শিডিউল (Repayment Schedule)</h2>
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 text-slate-500">
                                <th className="py-1.5">#</th>
                                <th className="py-1.5">নির্ধারিত তারিখ</th>
                                <th className="py-1.5">আসল</th>
                                <th className="py-1.5">সার্ভিস চার্জ</th>
                                <th className="py-1.5">আদায়</th>
                                <th className="py-1.5">স্ট্যাটাস</th>
                            </tr>
                        </thead>
                        <tbody>
                            {account.installments.map((inst) => (
                                <tr key={inst.id} className="border-b border-slate-50">
                                    <td className="py-1.5 font-semibold">{inst.installment_no}</td>
                                    <td className="py-1.5">{formatDate(inst.due_date)}</td>
                                    <td className="py-1.5">{fmt(inst.principal_due_paisa)}</td>
                                    <td className="py-1.5">{fmt(inst.service_charge_due_paisa)}</td>
                                    <td className="py-1.5">{fmt(inst.principal_paid_paisa + inst.service_charge_paid_paisa)}</td>
                                    <td className="py-1.5 uppercase font-bold">{inst.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
