import React from 'react';
import { Download } from 'lucide-react';
import type {
    ColVisVariant,
    TeamBasedColVis,
    TeamBasedExportMeta,
    TeamBasedExportRow,
} from '@/utils/teamBasedExport';

interface Props {
    exportUrl: string;
    filterParams: Record<string, string | number | undefined | null>;
    totalCount: number;
    colVisVariant: ColVisVariant;
    meta: TeamBasedExportMeta;
    compact?: boolean;
    className?: string;
}

export default function TeamBasedExportBar({
    exportUrl,
    filterParams,
    totalCount,
    colVisVariant,
    meta,
    compact = false,
    className = '',
}: Props) {
    const [exporting, setExporting] = React.useState(false);
    const disabled = totalCount === 0 || exporting;

    const handleExport = async () => {
        if (disabled) return;
        setExporting(true);
        try {
            const { buildExportQueryString, computeColVis, exportTeamBasedToXlsx } = await import(
                '@/utils/teamBasedExport'
            );

            const query = buildExportQueryString(filterParams);
            const response = await fetch(`${exportUrl}?${query}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Export request failed');
            }

            const data = (await response.json()) as { rows?: TeamBasedExportRow[]; total?: number };
            const rows = data.rows ?? [];
            const colVis = computeColVis(rows, colVisVariant);
            exportTeamBasedToXlsx(rows, colVis, meta);
        } catch {
            window.alert('Excel ডাউনলোড করা যায়নি। আবার চেষ্টা করুন।');
        } finally {
            window.setTimeout(() => setExporting(false), 400);
        }
    };

    if (compact) {
        return (
            <button
                type="button"
                onClick={handleExport}
                disabled={disabled}
                title="Download Excel (XLSX)"
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow active:scale-[0.98] ${
                    disabled
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                } ${className}`}
            >
                <Download size={15} className={exporting ? 'animate-pulse' : ''} />
                {exporting ? 'Downloading…' : 'Download XLSX'}
            </button>
        );
    }

    return (
        <div
            className={`mt-4 print:hidden flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border border-slate-200 bg-slate-50/30 rounded-2xl ${className}`}
        >
            <p className="text-xs text-slate-600 font-medium order-2 sm:order-1">
                {totalCount > 0 ? (
                    <>
                        ফিল্টার অনুযায়ী মোট{' '}
                        <span className="text-slate-900 font-semibold">{totalCount} টি</span> আইটেম Excel-এ
                        ডাউনলোড হবে (সব পাতা সহ)
                    </>
                ) : (
                    'ডাউনলোড করার জন্য কোনো আইটেম নেই'
                )}
            </p>
            <button
                type="button"
                onClick={handleExport}
                disabled={disabled}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm order-1 sm:order-2 ${
                    disabled
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 hover:shadow active:scale-[0.98]'
                }`}
            >
                <Download size={15} className={exporting ? 'animate-pulse' : ''} />
                {exporting ? 'প্রস্তুত হচ্ছে…' : 'Download XLSX'}
            </button>
        </div>
    );
}
