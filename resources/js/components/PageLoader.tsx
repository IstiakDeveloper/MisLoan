import { router } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';

/**
 * PageLoader - Lightweight Corner Indicator
 *
 * Requirements met:
 * 1. Simple, elegant top-right corner pill indicator ("corner e rakho").
 * 2. Absolutely NO site blur or dark backdrop overlay ("site blur na hok").
 * 3. Completely hidden in print media & PDF prints ("print:hidden" + print CSS).
 * 4. Fast, lightweight, zero lag, unmounts completely when idle.
 */
export default function PageLoader() {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showBadge, setShowBadge] = useState(false);

    const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const badgeTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

    const cleanup = () => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
        if (badgeTimerRef.current) {
            clearTimeout(badgeTimerRef.current);
            badgeTimerRef.current = null;
        }
        if (finishTimerRef.current) {
            clearTimeout(finishTimerRef.current);
            finishTimerRef.current = null;
        }
    };

    useEffect(() => {
        const start = () => {
            cleanup();
            setIsLoading(true);
            setProgress(25);

            // Show corner badge if request takes > 180ms
            badgeTimerRef.current = setTimeout(() => {
                setShowBadge(true);
            }, 180);

            // Smooth forward trickle for the top hairline bar
            progressTimerRef.current = setInterval(() => {
                setProgress((prev) => {
                    if (prev < 60) return prev + 8;
                    if (prev < 80) return prev + 4;
                    if (prev < 92) return prev + 1;
                    return prev;
                });
            }, 100);
        };

        const onProgress = (event: any) => {
            if (event?.detail?.progress?.percentage) {
                setProgress(event.detail.progress.percentage);
            }
        };

        const finish = () => {
            cleanup();
            setProgress(100);

            // Fast, snappy dismissal (120ms) - no lingering delay
            finishTimerRef.current = setTimeout(() => {
                setIsLoading(false);
                setShowBadge(false);
                setProgress(0);
            }, 120);
        };

        const unbindStart = router.on('start', start);
        const unbindProgress = router.on('progress', onProgress);
        const unbindFinish = router.on('finish', finish);
        const unbindCancel = router.on('cancel', finish);
        const unbindError = router.on('error', finish);

        return () => {
            unbindStart();
            unbindProgress();
            unbindFinish();
            unbindCancel();
            unbindError();
            cleanup();
        };
    }, []);

    // 0% DOM / CPU overhead when idle
    if (!isLoading && progress === 0) {
        return null;
    }

    return (
        <aside
            aria-label="Application loading"
            className="misloan-page-loader print:hidden fixed inset-x-0 top-0 z-[999999] pointer-events-none select-none"
            style={{ pointerEvents: 'none' }}
        >
            <style>{`
                @media print {
                    .misloan-page-loader,
                    aside[aria-label="Application loading"] {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                    }
                }
            `}</style>

            {/* Ultra-slim 2px Top Hairline Progress Bar */}
            <div
                className="h-[2px] w-full overflow-hidden transition-opacity duration-200"
                style={{
                    opacity: isLoading || progress > 0 ? 1 : 0,
                    pointerEvents: 'none',
                }}
            >
                <div
                    className="h-full transition-all duration-150 ease-out"
                    style={{
                        width: `${Math.min(100, Math.max(progress, 0))}%`,
                        background:
                            'linear-gradient(90deg, #008030 0%, #10a020 50%, #34d399 100%)',
                        boxShadow: '0 1px 3px rgba(16, 160, 32, 0.3)',
                    }}
                />
            </div>

            {/* Clean, Non-Intrusive Corner Badge (No backdrop blur over site) */}
            {showBadge && (
                <div
                    className="fixed top-3.5 right-4 sm:right-6 pointer-events-none select-none transition-all duration-150 animate-in fade-in slide-in-from-top-1"
                    style={{ pointerEvents: 'none' }}
                >
                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 shadow-md shadow-zinc-950/5 dark:shadow-black/25 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-sm"
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* Compressed 2.5KB Brand Mini-Logo */}
                        <div className="size-4 shrink-0 flex items-center justify-center">
                            <picture className="size-4 shrink-0 pointer-events-none">
                                <source srcSet="/icons/logo-loader.webp" type="image/webp" />
                                <img
                                    src="/icons/logo-loader.png"
                                    alt="MisLoan"
                                    className="size-full object-contain pointer-events-none"
                                    width={16}
                                    height={16}
                                    loading="eager"
                                />
                            </picture>
                        </div>

                        {/* Micro Emerald Hairline Spinner */}
                        <div
                            className="size-3 shrink-0 rounded-full border-[1.5px] border-emerald-500/25 border-t-emerald-600 dark:border-t-emerald-400 animate-spin"
                            style={{ pointerEvents: 'none' }}
                        />

                        {/* Status Text */}
                        <span
                            className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 tracking-tight pointer-events-none"
                            style={{ pointerEvents: 'none' }}
                        >
                            লোড হচ্ছে...
                        </span>
                    </div>
                </div>
            )}
        </aside>
    );
}
