import AdminLayout from '@/layouts/admin-layout';
import {
    accountingSections,
    accountingUrl,
    type AccountingSection,
} from '@/lib/accounting-navigation';
import { Head, Link, router } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Branch } from './types';

export default function AccountingFrame({
    section,
    branches,
    branchId,
    actions,
    children,
    allowAll = false,
    filters = {},
}: {
    section: AccountingSection;
    branches: Branch[];
    branchId: number | null;
    actions?: ReactNode;
    children: ReactNode;
    allowAll?: boolean;
    filters?: Record<string, string | number | undefined>;
}) {
    const current = accountingSections.find((item) => item.id === section)!;
    const branch = branches.find((item) => item.id === branchId);
    return (
        <AdminLayout>
            <Head title={`${current.subtitle} · Accounting`} />
            <div className="space-y-5 px-4 lg:px-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase">
                            Accounting workspace
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            {current.title}
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            {current.description}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        {actions}
                    </div>
                </header>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 print:hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-xs">
                            <Building2 className="size-4 text-emerald-700" />
                            <span className="font-semibold">
                                {branch
                                    ? `${branch.code} · ${branch.name}`
                                    : allowAll
                                      ? 'সব শাখা'
                                      : 'প্রথমে একটি শাখা তৈরি করুন'}
                            </span>
                            <span className="hidden text-slate-400 sm:inline">
                                · {current.subtitle}
                            </span>
                        </div>
                        <label className="flex items-center gap-2 text-[11px] text-slate-500">
                            শাখা
                            <select
                                aria-label="Accounting branch"
                                disabled={!branches.length}
                                className="max-w-60 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                value={branchId || ''}
                                onChange={(event) => {
                                    const { voucher_id: _voucher, ...rest } =
                                        filters;
                                    void _voucher;
                                    router.get(
                                        accountingUrl(
                                            section,
                                            Number(event.target.value) || null,
                                            rest,
                                        ),
                                    );
                                }}
                            >
                                {allowAll && <option value="">সব শাখা</option>}
                                {!branches.length && (
                                    <option value="">শাখা নেই</option>
                                )}
                                {branches.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.code} · {item.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <nav
                        aria-label="Accounting tasks"
                        className="flex overflow-x-auto px-2"
                    >
                        {accountingSections
                            .filter((item) => item.id !== 'create')
                            .map((item) => {
                                const active =
                                    item.id === section ||
                                    (section === 'create' &&
                                        item.id === 'vouchers');
                                return (
                                    <Link
                                        key={item.id}
                                        href={accountingUrl(item.id, branchId)}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium whitespace-nowrap transition ${active ? 'border-emerald-700 text-emerald-800 dark:text-emerald-300' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'}`}
                                    >
                                        <item.icon className="size-3.5" />
                                        {item.title}
                                    </Link>
                                );
                            })}
                    </nav>
                </div>
                {children}
            </div>
        </AdminLayout>
    );
}
