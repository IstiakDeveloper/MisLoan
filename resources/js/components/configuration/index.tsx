import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function ConfigurationPage({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'mx-auto w-full max-w-[1600px] space-y-5 pb-8',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function ConfigurationHeader({
    title,
    description,
    icon: Icon,
    actions,
}: {
    title: string;
    description: string;
    icon: LucideIcon;
    actions?: ReactNode;
}) {
    return (
        <section className="relative overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-700 via-blue-600 to-slate-700 px-5 py-6 text-white shadow-lg shadow-blue-950/10 sm:px-7">
            <div className="absolute -top-20 -right-20 size-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-24 left-1/3 size-48 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 shadow-inner backdrop-blur-sm">
                        <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-blue-100 uppercase">
                            Configuration
                        </p>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            {title}
                        </h1>
                        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-blue-50/90">
                            {description}
                        </p>
                    </div>
                </div>
                {actions && (
                    <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
                        {actions}
                    </div>
                )}
            </div>
        </section>
    );
}

export function StatGrid({ children }: { children: ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {children}
        </div>
    );
}

export function StatCard({
    label,
    value,
    icon: Icon,
    tone = 'blue',
}: {
    label: string;
    value: ReactNode;
    icon: LucideIcon;
    tone?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';
}) {
    const tones = {
        blue: 'bg-blue-50 text-blue-700 ring-blue-100',
        green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        purple: 'bg-violet-50 text-violet-700 ring-violet-100',
        orange: 'bg-orange-50 text-orange-700 ring-orange-100',
        pink: 'bg-pink-50 text-pink-700 ring-pink-100',
        teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    };

    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <div
                className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1',
                    tones[tone],
                )}
            >
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                    {value}
                </div>
                <div className="truncate text-sm text-slate-600">{label}</div>
            </div>
        </div>
    );
}

export function ConfigurationCard({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
                className,
            )}
        >
            {children}
        </section>
    );
}

export function ConfigurationToolbar({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center',
                className,
            )}
        >
            {children}
        </div>
    );
}

export function SearchField({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
}) {
    return (
        <div className={cn('relative w-full sm:max-w-md', className)}>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-900 shadow-sm transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
        </div>
    );
}

export function TableScroll({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('w-full overflow-x-auto', className)}>
            {children}
        </div>
    );
}

export const tableClassName = 'w-full min-w-[720px] text-sm';
export const tableHeadClassName = 'border-b border-slate-200 bg-slate-50/90';
export const tableHeaderClassName =
    'whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500';
export const tableCellClassName = 'px-4 py-3 text-slate-600';
export const tableRowClassName =
    'border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/40';

export function EmptyState({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icon className="size-6" />
            </div>
            <p className="font-semibold text-slate-700">{title}</p>
            {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
        </div>
    );
}

export function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600',
            )}
        >
            <span
                className={cn(
                    'size-1.5 rounded-full',
                    active ? 'bg-emerald-500' : 'bg-slate-400',
                )}
            />
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

export function LocalPagination({
    currentPage,
    totalPages,
    totalItems,
    perPage,
    itemLabel,
    onPageChange,
    onPerPageChange,
}: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
    itemLabel: string;
    onPageChange: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
}) {
    if (totalItems === 0) return null;
    const from = (currentPage - 1) * perPage + 1;
    const to = Math.min(currentPage * perPage, totalItems);

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                <p className="text-xs text-slate-600">
                    Showing {from}–{to} of {totalItems} {itemLabel}
                </p>
                {onPerPageChange && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span>Items per page:</span>
                        <select
                            value={perPage}
                            onChange={(e) => onPerPageChange(Number(e.target.value))}
                            className="h-8 cursor-pointer rounded-lg border border-slate-300 bg-white py-1 pr-8 pl-3 text-xs text-slate-700 shadow-sm transition-colors hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        >
                            {[10, 25, 50, 100].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-label="Previous page"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 focus:ring-4 focus:ring-blue-100 focus:outline-none disabled:pointer-events-none disabled:opacity-40"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <span className="px-3 text-xs font-medium text-slate-600">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    type="button"
                    aria-label="Next page"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 focus:ring-4 focus:ring-blue-100 focus:outline-none disabled:pointer-events-none disabled:opacity-40"
                >
                    <ChevronRight className="size-4" />
                </button>
            </div>
        </div>
    );
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export function ServerPagination({
    links,
    onNavigate,
    summary,
    perPage,
    onPerPageChange,
}: {
    links: PaginationLink[];
    onNavigate?: (url: string) => void;
    summary?: ReactNode;
    perPage?: number;
    onPerPageChange?: (perPage: number) => void;
}) {
    if (links.length <= 1) return null;

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                <div className="text-xs text-slate-600">{summary}</div>
                {onPerPageChange && perPage && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span>Items per page:</span>
                        <select
                            value={perPage}
                            onChange={(e) => onPerPageChange(Number(e.target.value))}
                            className="h-8 cursor-pointer rounded-lg border border-slate-300 bg-white py-1 pr-8 pl-3 text-xs text-slate-700 shadow-sm transition-colors hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        >
                            {[10, 25, 50, 100].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            <nav
                className="flex max-w-full items-center gap-1 overflow-x-auto"
                aria-label="Pagination"
            >
                {links.map((link, index) => {
                    const classes = cn(
                        'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-xs font-medium transition focus:ring-4 focus:ring-blue-100 focus:outline-none',
                        link.active
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100',
                        !link.url && 'pointer-events-none opacity-40',
                    );
                    const label = link.label
                        .replace('&laquo;', '‹')
                        .replace('&raquo;', '›');

                    return onNavigate ? (
                        <button
                            type="button"
                            key={`${link.label}-${index}`}
                            disabled={!link.url || link.active}
                            onClick={() => link.url && onNavigate(link.url)}
                            className={classes}
                        >
                            {label}
                        </button>
                    ) : (
                        <Link
                            key={`${link.label}-${index}`}
                            href={link.url || '#'}
                            className={classes}
                        >
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
