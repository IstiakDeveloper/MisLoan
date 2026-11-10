import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export const financeInput =
    'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
export const financeButton =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50';
export const financeSecondary =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

export function formatPaisa(value: string | number | bigint): string {
    const amount = BigInt(value);
    const absolute = amount < 0n ? -amount : amount;
    const whole = String(absolute / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${amount < 0n ? '-' : ''}${whole}.${String(absolute % 100n).padStart(2, '0')}`;
}
export function Paisa({ value }: { value: string | number | bigint }) {
    return (
        <span className="font-variant-numeric tabular-nums">
            ৳{formatPaisa(value)}
        </span>
    );
}
export function Status({ value }: { value: string }) {
    const color = ['active', 'approved', 'disbursed', 'matched'].includes(value)
        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        : ['closed', 'repaid', 'rejected'].includes(value)
          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    return (
        <span
            className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold capitalize ${color}`}
        >
            {value.replaceAll('_', ' ')}
        </span>
    );
}
export function FinancePanel({
    title,
    description,
    action,
    children,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {description && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {description}
                        </p>
                    )}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}
export function FinanceErrors({ errors }: { errors: Record<string, string> }) {
    const messages = Object.values(errors);
    return messages.length ? (
        <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
        >
            {messages.map((message, i) => (
                <p key={i}>{message}</p>
            ))}
        </div>
    ) : null;
}
export function FinanceEmpty({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="px-5 py-12 text-center">
            <Inbox className="mx-auto mb-3 size-8 text-slate-300" />
            <p className="text-sm font-semibold">{title}</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
                {description}
            </p>
        </div>
    );
}
export type FinancePage<T> = {
    data: T[];
    total?: number;
    current_page?: number;
    last_page?: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};
export function FinancePages({ page }: { page: FinancePage<unknown> }) {
    if (!page.prev_page_url && !page.next_page_url) return null;
    return (
        <nav
            aria-label="Pagination"
            className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-slate-800"
        >
            <span>
                Page {page.current_page ?? 1} of {page.last_page ?? 1}
                {page.total !== undefined ? ` · ${page.total} records` : ''}
            </span>
            <div className="flex gap-3">
                {page.prev_page_url && (
                    <Link
                        className="flex items-center gap-1 hover:text-emerald-700"
                        href={page.prev_page_url}
                    >
                        <ArrowLeft className="size-3" />
                        Previous
                    </Link>
                )}
                {page.next_page_url && (
                    <Link
                        className="flex items-center gap-1 hover:text-emerald-700"
                        href={page.next_page_url}
                    >
                        Next
                        <ArrowRight className="size-3" />
                    </Link>
                )}
            </div>
        </nav>
    );
}
