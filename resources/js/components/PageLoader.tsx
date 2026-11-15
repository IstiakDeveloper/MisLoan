import { router } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';

/**
 * PageLoader
 * Ultra-lightweight, professional page transition indicator.
 * - Hairline 2px emerald brand progress bar at top.
 * - Sleek, distraction-free floating micro-badge (shows only if transition > 280ms).
 * - Utilizes optimized 2.5KB compressed WebP logo with PNG fallback.
 * - 0% CPU/GPU overhead when idle.
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
            setProgress(18);

            // Debounce badge: fast page shifts (< 280ms) never flicker the badge
            badgeTimerRef.current = setTimeout(() => {
                setShowBadge(true);
            }, 280);

            // Calm, steady progress trickle without erratic random jumps
            progressTimerRef.current = setInterval(() => {
                setProgress((prev) => {
                    if (prev < 50) return prev + 5;
                    if (prev < 75) return prev + 2.5;
                    if (prev < 90) return prev + 0.8;
                    return prev;
                });
            }, 120);
        };

        const onProgress = (event: any) => {
            if (event?.detail?.progress?.percentage) {
                setProgress(event.detail.progress.percentage);
            }
        };

        const finish = () => {
            cleanup();
            setProgress(100);

            // Smooth exit: allow the 100% state to display briefly, then fade out
            finishTimerRef.current = setTimeout(() => {
                setIsLoading(false);
                setShowBadge(false);
                setProgress(0);
            }, 250);
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

    // Guaranteed 0% DOM / render overhead when idle
    if (!isLoading && progress === 0) {
        return null;
    }

    return (
        <aside
            aria-label="Page loading"
            className="fixed inset-x-0 top-0 z-[999999] pointer-events-none select-none"
            style={{ pointerEvents: 'none' }}
        >
            {/* Top Hairline Progress Bar */}
            <div
                className="relative h-[2px] sm:h-[2.5px] w-full overflow-hidden transition-opacity duration-300"
                style={{
                    opacity: isLoading || progress > 0 ? 1 : 0,
                    pointerEvents: 'none',
                }}
            >
                <div
                    className="h-full transition-all duration-200 ease-out relative"
                    style={{
                        width: `${Math.min(100, Math.max(progress, 0))}%`,
                        background:
                            'linear-gradient(90deg, #008030 0%, #10a020 50%, #34d399 100%)',
                        boxShadow: '0 1px 3px rgba(16, 160, 32, 0.35)',
                        pointerEvents: 'none',
                    }}
                >
                    {/* Subtle leading shimmer highlight (no harsh glare or blur ball) */}
                    <div
                        className="absolute right-0 top-0 bottom-0 w-20 pointer-events-none"
                        style={{
                            background:
                                'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 100%)',
                        }}
                    />
                </div>
            </div>

            {/* Dynamic Island Style Micro-Badge (Only visible during longer loads > 280ms) */}
            {showBadge && (
                <div
                    className="fixed top-3 left-1/2 -translate-x-1/2 pointer-events-none select-none transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-1"
                    style={{ pointerEvents: 'none' }}
                >
                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 shadow-md shadow-zinc-900/5 dark:shadow-black/25 border border-zinc-200/70 dark:border-zinc-800/80 backdrop-blur-md"
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* Compressed Brand Mini-Logo (2.5KB WebP) */}
                        <div className="relative size-4 flex items-center justify-center shrink-0 pointer-events-none">
                            <picture className="size-4 shrink-0 pointer-events-none">
                                <source srcSet="/icons/logo-loader.webp" type="image/webp" />
                                <img
                                    src="/icons/logo-loader.png"
                                    alt="MisLoan"
                                    className="size-full object-contain"
                                    width={16}
                                    height={16}
                                    loading="eager"
                                />
                            </picture>
                        </div>

                        {/* Ultra-fine hairline spinner in brand emerald */}
                        <div
                            className="size-3 shrink-0 rounded-full border-[1.5px] border-emerald-500/25 border-t-emerald-600 dark:border-t-emerald-400 animate-spin"
                            style={{ pointerEvents: 'none' }}
                        />

                        {/* Subtle status text */}
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
