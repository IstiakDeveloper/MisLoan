import { usePwaUpdate } from '@/hooks/usePwaUpdate';
import { RefreshCw, X } from 'lucide-react';

export default function PwaUpdateBanner() {
    const { updateAvailable, applyUpdate, dismiss } = usePwaUpdate();

    if (!updateAvailable) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-3 print:hidden">
            <div
                className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-brand/20 bg-white/95 p-3 shadow-xl shadow-brand/15 backdrop-blur-md animate-in fade-in slide-in-from-top-3"
                role="status"
                aria-live="polite"
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-softer">
                    <img src="/icons/logo.png" alt="" className="h-full w-full object-contain p-0.5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold leading-tight text-slate-900">নতুন আপডেট আছে</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-600">নতুন ভার্সন ইনস্টল করতে আপডেট করুন।</p>
                </div>
                <button
                    type="button"
                    onClick={applyUpdate}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-3 py-1.5 text-[11px] font-bold text-white shadow-sm"
                >
                    <RefreshCw className="h-3 w-3" />
                    আপডেট
                </button>
                <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Dismiss update"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
