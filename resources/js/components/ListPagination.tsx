import { ChevronLeft, ChevronRight } from 'lucide-react';

export const LIST_PER_PAGE_OPTIONS = [10, 20, 25, 50, 100] as const;

export type PaginatedMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from?: number | null;
    to?: number | null;
};

function getPageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (current <= 3) {
        return [1, 2, 3, 4, 'ellipsis', totalPages];
    }
    if (current >= totalPages - 2) {
        return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
}

export default function ListPagination({
    meta,
    pagination,
    onPageChange,
    onPerPageChange,
    itemLabel = 'টি রেকর্ড',
}: {
    meta?: PaginatedMeta;
    pagination?: PaginatedMeta;
    onPageChange?: (page: number) => void;
    onPerPageChange?: (perPage: number) => void;
    itemLabel?: string;
}) {
    const data = meta || pagination;
    if (!data) {
        return null;
    }

    const total = data.total ?? 0;
    if (total === 0) {
        return null;
    }

    const current = data.current_page || 1;
    const lastPage = Math.max(1, data.last_page || 1);
    const perPage = data.per_page || 20;
    const from = data.from ?? (current - 1) * perPage + 1;
    const to = data.to ?? Math.min(current * perPage, total);

    return (
        <div className="print:hidden flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/50 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                <p className="text-xs text-slate-600">
                    দেখাচ্ছে{' '}
                    <span className="font-semibold text-slate-900">{from}</span>–
                    <span className="font-semibold text-slate-900">{to}</span>
                    {' · সর্বমোট '}
                    <span className="font-semibold text-slate-900">{total}</span> {itemLabel}
                </p>
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <span className="whitespace-nowrap">প্রতি পৃষ্ঠায়</span>
                    <select
                        value={perPage}
                        onChange={(e) => onPerPageChange?.(Number(e.target.value))}
                        className="h-8 cursor-pointer rounded-lg border border-slate-300 bg-white py-1 pr-8 pl-2.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        {LIST_PER_PAGE_OPTIONS.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <nav className="flex items-center justify-center gap-1.5" aria-label="পেজিনেশন">
                <button
                    type="button"
                    onClick={() => onPageChange?.(current - 1)}
                    disabled={current <= 1}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ChevronLeft className="size-3.5" />
                    <span className="hidden sm:inline">পূর্ববর্তী</span>
                </button>

                <div className="flex items-center gap-1">
                    {getPageNumbers(current, lastPage).map((page, index) =>
                        page === 'ellipsis' ? (
                            <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-slate-400">
                                …
                            </span>
                        ) : (
                            <button
                                key={page}
                                type="button"
                                onClick={() => onPageChange?.(page)}
                                className={`flex size-8 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                                    current === page
                                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                {page}
                            </button>
                        ),
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange?.(current + 1)}
                    disabled={current >= lastPage}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <span className="hidden sm:inline">পরবর্তী</span>
                    <ChevronRight className="size-3.5" />
                </button>
            </nav>
        </div>
    );
}
