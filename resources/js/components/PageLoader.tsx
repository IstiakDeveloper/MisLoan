import { router } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';

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
            setProgress(22);

            // Delay badge so quick navigations (< 250ms) only show the top glowing beam
            badgeTimerRef.current = setTimeout(() => {
                setShowBadge(true);
            }, 250);

            // Smooth progress increment
            progressTimerRef.current = setInterval(() => {
                setProgress((prev) => {
                    if (prev < 50) return prev + Math.random() * 14 + 7;
                    if (prev < 80) return prev + Math.random() * 8 + 3;
                    if (prev < 92) return prev + Math.random() * 2 + 0.5;
                    return prev;
                });
            }, 180);
        };

        const onProgress = (event: any) => {
            if (event?.detail?.progress?.percentage) {
                setProgress(event.detail.progress.percentage);
            }
        };

        const finish = () => {
            cleanup();
            setProgress(100);
            finishTimerRef.current = setTimeout(() => {
                setIsLoading(false);
                setShowBadge(false);
                setProgress(0);
            }, 260);
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

    // When not loading and progress is 0, render NOTHING in the DOM
    // This guarantees 0% CPU/GPU overhead when idle
    if (!isLoading && progress === 0) {
        return null;
    }

    return (
        <aside
            aria-label="Loading indicator"
            className="fixed inset-x-0 top-0 z-[999999] pointer-events-none select-none"
            style={{ pointerEvents: 'none' }}
        >
            {/* Top Glowing Laser Progress Beam */}
            <div
                className="relative h-[3.5px] w-full overflow-hidden transition-opacity duration-300"
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
                            'linear-gradient(90deg, #008030 0%, #10a020 40%, #34d399 75%, #f59e0b 100%)',
                        boxShadow:
                            '0 0 12px rgba(16, 160, 32, 0.8), 0 0 4px rgba(245, 158, 11, 0.6)',
                        pointerEvents: 'none',
                    }}
                >
                    {/* Glowing Leading Head */}
                    <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-20 h-6 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(245, 158, 11, 0.9) 0%, rgba(52, 211, 153, 0.6) 40%, transparent 80%)',
                            filter: 'blur(3px)',
                            transform: 'translate(50%, -50%)',
                            pointerEvents: 'none',
                        }}
                    />
                </div>
            </div>

            {/* Non-Blocking Floating Top Badge (Shows only if loading takes > 250ms) */}
            {showBadge && (
                <div
                    className="fixed top-3.5 right-4 sm:right-6 pointer-events-none select-none transition-all duration-300"
                    style={{ pointerEvents: 'none' }}
                >
                    <div
                        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 shadow-lg border border-emerald-500/30 dark:border-emerald-500/20 backdrop-blur-md"
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* Orbiting spinner */}
                        <div
                            className="relative size-4 flex items-center justify-center pointer-events-none"
                            style={{ pointerEvents: 'none' }}
                        >
                            <div
                                className="size-full rounded-full border-2 border-emerald-500/30 border-t-emerald-600 dark:border-t-emerald-400 animate-spin"
                                style={{ pointerEvents: 'none' }}
                            />
                        </div>

                        {/* Text */}
                        <span
                            className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 pointer-events-none"
                            style={{ pointerEvents: 'none' }}
                        >
                            লোড হচ্ছে...
                        </span>

                        {/* Progress percentage */}
                        <span
                            className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 pointer-events-none"
                            style={{ pointerEvents: 'none' }}
                        >
                            {Math.round(progress)}%
                        </span>
                    </div>
                </div>
            )}
        </aside>
    );
}
