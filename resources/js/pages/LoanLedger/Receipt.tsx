import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate } from '@/utils/dateUtils';

interface Props {
    transaction: {
        id: number;
        reference: string;
        kind: string;
        business_date: string;
        principal_paisa: number;
        service_charge_paisa: number;
        total_paisa: number;
        payment_mode: string;
        note: string | null;
        creator?: { name: string } | null;
        loan_account?: {
            account_no: string;
            branch?: { name: string; code: string } | null;
            member_admission?: { applicant_name_bn?: string; applicant_name_en?: string; member_code?: string } | null;
        } | null;
    };
}

const fmt = (p: number) => `৳${(p / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CashReceipt({ transaction }: Props) {
    const acc = transaction.loan_account;

    return (
        <AdminLayout>
            <Head title={`Receipt - ${transaction.reference}`} />
            <div className="mx-auto max-w-xl p-6">
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-start justify-between border-b pb-4">
                        <div>
                            <h1 className="text-base font-bold text-slate-900">ক্যাশ রিসিট (Cash Receipt)</h1>
                            <p className="text-xs text-slate-500">
                                {acc?.branch?.name} ({acc?.branch?.code})
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="print:hidden inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </button>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Reference:</span>
                            <span className="font-mono font-bold">{transaction.reference.slice(0, 12).toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">তারিখ:</span>
                            <span className="font-bold">{formatDate(transaction.business_date)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">সদস্য:</span>
                            <span className="font-semibold">
                                {acc?.member_admission?.applicant_name_bn || acc?.member_admission?.applicant_name_en} ({acc?.member_admission?.member_code})
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">লোন অ্যাকাউন্ট:</span>
                            <span className="font-bold">{acc?.account_no}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                            <span className="text-slate-500">আসল (Principal):</span>
                            <span>{fmt(transaction.principal_paisa)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">সার্ভিস চার্জ:</span>
                            <span>{fmt(transaction.service_charge_paisa)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 text-sm font-bold text-emerald-700">
                            <span>মোট আদায়:</span>
                            <span>{fmt(transaction.total_paisa)}</span>
                        </div>
                    </div>

                    <div className="flex justify-between border-t pt-6 text-[11px] text-slate-500">
                        <span>সংগ্রহকারী: {transaction.creator?.name ?? '-'}</span>
                        <span>সদস্যের স্বাক্ষর</span>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
