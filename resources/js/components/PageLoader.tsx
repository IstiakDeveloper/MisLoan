import { router } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';

/**
 * PageLoader - Premium Motion Graphic Loader
 *
 * Features:
 * - Fluid, 60fps GPU-accelerated motion graphic (orbital ring, radar pulse, ambient aura, logo shimmer).
 * - Ultra-lightweight: pure CSS transforms & 2.5KB compressed WebP logo.
 * - Zero lag / 0% CPU when idle: elements completely unmounted when not loading.
 * - Non-blocking: pointer-events: none ensures zero input interruption.
 * - Smart debounce (150ms): instant route navigations never flash the center graphic.
 */
export default function PageLoader() {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showMotion, setShowMotion] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const motionTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finishTimerRef = useRef<NodeJS.Timeout | null>(null);

    const cleanup = () => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
        if (motionTimerRef.current) {
            clearTimeout(motionTimerRef.current);
            motionTimerRef.current = null;
        }
        if (finishTimerRef.current) {
            clearTimeout(finishTimerRef.current);
            finishTimerRef.current = null;
        }
    };

    useEffect(() => {
        const start = () => {
            cleanup();
            setIsExiting(false);
            setIsLoading(true);
            setProgress(20);

            // Debounce: only show center motion graphic if load takes > 150ms
            motionTimerRef.current = setTimeout(() => {
                setShowMotion(true);
            }, 150);

            // Steady progress trickle for the top hairline bar
            progressTimerRef.current = setInterval(() => {
                setProgress((prev) => {
                    if (prev < 50) return prev + 6;
                    if (prev < 75) return prev + 3;
                    if (prev < 90) return prev + 0.8;
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
            setIsExiting(true);

            // Quick, fluid exit transition (200ms)
            finishTimerRef.current = setTimeout(() => {
                setIsLoading(false);
                setShowMotion(false);
                setIsExiting(false);
                setProgress(0);
            }, 220);
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
    if (!isLoading && !showMotion && progress === 0) {
        return null;
    }

    return (
        <aside
            aria-label="Application loading"
            className="fixed inset-0 z-[999999] pointer-events-none select-none"
            style={{ pointerEvents: 'none' }}
        >
            {/* Inline scoped keyframes for 60fps GPU acceleration */}
            <style>{`
                @keyframes misloan-aura {
                    0%, 100% { transform: scale(0.88); opacity: 0.35; }
                    50% { transform: scale(1.28); opacity: 0.75; }
                }
                @keyframes misloan-sonar-1 {
                    0% { transform: scale(0.7); opacity: 0.85; }
                    100% { transform: scale(1.42); opacity: 0; }
                }
                @keyframes misloan-sonar-2 {
                    0% { transform: scale(0.6); opacity: 0; }
                    25% { opacity: 0.7; }
                    100% { transform: scale(1.52); opacity: 0; }
                }
                @keyframes misloan-orbit {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes misloan-orbit-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                @keyframes misloan-shimmer {
                    0% { transform: translateX(-160%) rotate(25deg); }
                    40%, 100% { transform: translateX(260%) rotate(25deg); }
                }
                @keyframes misloan-beam {
                    0% { transform: translateX(-100%); width: 28%; }
                    50% { transform: translateX(35%); width: 55%; }
                    100% { transform: translateX(190%); width: 28%; }
                }
                @keyframes misloan-pulse-subtle {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            `}</style>

            {/* Top Hairline Progress Bar */}
            <div
                className="fixed inset-x-0 top-0 h-[2.5px] w-full overflow-hidden transition-opacity duration-300"
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
                        boxShadow: '0 1px 4px rgba(16, 160, 32, 0.45)',
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none"
                        style={{
                            background:
                                'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 100%)',
                        }}
                    />
                </div>
            </div>

            {/* Center Motion Graphic Overlay (Activates smoothly on transitions > 150ms) */}
            {showMotion && (
                <div
                    className={`fixed inset-0 flex items-center justify-center transition-all duration-200 ease-out ${
                        isExiting
                            ? 'opacity-0 scale-95'
                            : 'opacity-100 scale-100'
                    }`}
                    style={{ pointerEvents: 'none' }}
                >
                    {/* Subtle Frosted Backdrop Blur */}
                    <div
                        className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[3px] transition-opacity duration-200"
                        style={{ pointerEvents: 'none' }}
                    />

                    {/* Central Glassmorphic Motion Graphic Card */}
                    <div
                        className="relative flex flex-col items-center justify-center px-8 py-6 rounded-3xl bg-white/95 dark:bg-zinc-900/95 shadow-2xl shadow-emerald-950/20 dark:shadow-black/70 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* Motion Graphic Orb Container */}
                        <div className="relative size-24 flex items-center justify-center">
                            {/* 1. Ambient Breathing Aura */}
                            <div
                                className="absolute inset-0 rounded-full bg-emerald-500/20 dark:bg-emerald-400/25 blur-xl pointer-events-none"
                                style={{
                                    animation: 'misloan-aura 2.4s ease-in-out infinite',
                                    willChange: 'transform, opacity',
                                }}
                            />

                            {/* 2. Concentric Sonar Ripple Waves */}
                            <div
                                className="absolute size-20 rounded-full border border-emerald-500/35 dark:border-emerald-400/35 pointer-events-none"
                                style={{
                                    animation:
                                        'misloan-sonar-1 2s cubic-bezier(0, 0.2, 0.8, 1) infinite',
                                    willChange: 'transform, opacity',
                                }}
                            />
                            <div
                                className="absolute size-20 rounded-full border border-teal-500/25 dark:border-teal-400/25 pointer-events-none"
                                style={{
                                    animation:
                                        'misloan-sonar-2 2s cubic-bezier(0, 0.2, 0.8, 1) 0.8s infinite',
                                    willChange: 'transform, opacity',
                                }}
                            />

                            {/* 3. Outer Precision SVG Orbital Gradient Ring */}
                            <svg
                                className="absolute size-24 pointer-events-none"
                                viewBox="0 0 96 96"
                                style={{
                                    animation: 'misloan-orbit 2s linear infinite',
                                    willChange: 'transform',
                                }}
                            >
                                <defs>
                                    <linearGradient
                                        id="misloanOrbitGrad"
                                        x1="0%"
                                        y1="0%"
                                        x2="100%"
                                        y2="100%"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor="#008030"
                                            stopOpacity="0"
                                        />
                                        <stop
                                            offset="45%"
                                            stopColor="#10a020"
                                            stopOpacity="0.45"
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor="#34d399"
                                            stopOpacity="1"
                                        />
                                    </linearGradient>
                                </defs>
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="44"
                                    fill="none"
                                    stroke="url(#misloanOrbitGrad)"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeDasharray="175 105"
                                />
                                {/* Glowing Satellite Bead */}
                                <circle
                                    cx="92"
                                    cy="48"
                                    r="3.5"
                                    fill="#34d399"
                                    style={{
                                        filter:
                                            'drop-shadow(0 0 5px rgba(52, 211, 153, 0.95))',
                                    }}
                                />
                            </svg>

                            {/* 4. Inner Counter-Rotating Dotted Ring */}
                            <svg
                                className="absolute size-20 pointer-events-none"
                                viewBox="0 0 80 80"
                                style={{
                                    animation:
                                        'misloan-orbit-reverse 4s linear infinite',
                                    willChange: 'transform',
                                }}
                            >
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    fill="none"
                                    stroke="currentColor"
                                    className="text-emerald-500/30 dark:text-emerald-400/25"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 7"
                                />
                            </svg>

                            {/* 5. Center Logo Jewel */}
                            <div
                                className="relative size-14 rounded-2xl bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 shadow-md shadow-emerald-950/10 border border-emerald-500/25 dark:border-emerald-500/30 flex items-center justify-center overflow-hidden p-2.5"
                                style={{
                                    animation:
                                        'misloan-pulse-subtle 2s ease-in-out infinite',
                                    willChange: 'transform',
                                }}
                            >
                                <picture className="size-full flex items-center justify-center pointer-events-none">
                                    <source
                                        srcSet="/icons/logo-loader.webp"
                                        type="image/webp"
                                    />
                                    <img
                                        src="/icons/logo-loader.png"
                                        alt="MisLoan"
                                        className="size-full object-contain pointer-events-none"
                                        width={36}
                                        height={36}
                                        loading="eager"
                                    />
                                </picture>

                                {/* Shimmer Specular Light Sweep */}
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    <div
                                        className="w-10 h-full bg-gradient-to-r from-transparent via-white/45 to-transparent pointer-events-none"
                                        style={{
                                            animation:
                                                'misloan-shimmer 2.2s ease-in-out infinite',
                                            willChange: 'transform',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Brand Label & Live Status Streamer */}
                        <div className="mt-4 flex flex-col items-center gap-1.5">
                            <span className="text-[12px] font-bold tracking-wider text-zinc-800 dark:text-zinc-100 uppercase">
                                MisLoan
                            </span>
                            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                ডাটা লোড হচ্ছে...
                            </span>

                            {/* Fluid High-Tech Micro Streamer */}
                            <div className="mt-1 w-18 h-1 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 overflow-hidden relative">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"
                                    style={{
                                        animation:
                                            'misloan-beam 1.4s ease-in-out infinite',
                                        willChange: 'transform',
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
