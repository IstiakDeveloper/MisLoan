import { usePageLoading } from '@/contexts/LoadingContext';
import React, { useEffect, useState } from 'react';

export default function PageLoader() {
    const { isLoading, progress, statusMessage } = usePageLoading();
    const [showHud, setShowHud] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Delay showing the centered HUD by 140ms so ultra-fast navigations only show the top bar
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;
        if (isLoading) {
            timer = setTimeout(() => {
                setShowHud(true);
            }, 140);
        } else {
            setShowHud(false);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isLoading]);

    if (!mounted) return null;

    return (
        <>
            {/* =========================================================================
                Tier 1: Top Glowing Laser Progress Beam (Always fires instantly 0ms)
                ========================================================================= */}
            <div
                className={`fixed top-0 left-0 right-0 z-[999999] pointer-events-none transition-opacity duration-300 ${
                    isLoading ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ height: '3.5px' }}
                aria-hidden="true"
            >
                {/* Progress track with gradient and smooth cubic-bezier easing */}
                <div
                    className="relative h-full transition-all duration-200 ease-out"
                    style={{
                        width: `${Math.min(100, Math.max(progress, 0))}%`,
                        background:
                            'linear-gradient(90deg, #008030 0%, #10a020 35%, #34d399 75%, #f59e0b 100%)',
                        boxShadow: '0 0 10px rgba(16, 160, 32, 0.5)',
                    }}
                >
                    {/* Glowing laser head on the edge */}
                    <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-28 h-5 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(245, 158, 11, 0.9) 0%, rgba(52, 211, 153, 0.6) 40%, transparent 80%)',
                            filter: 'blur(3px)',
                            transform: 'translate(40%, -50%)',
                        }}
                    />

                    {/* Continuous light sweep across the bar */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full animate-loader-shimmer pointer-events-none" />
                </div>
            </div>

            {/* =========================================================================
                Tier 2: Creative Center Glassmorphism HUD (For requests > 140ms)
                ========================================================================= */}
            <div
                className={`fixed inset-0 z-[99998] flex items-center justify-center pointer-events-none transition-all duration-300 ease-out ${
                    showHud
                        ? 'opacity-100 backdrop-blur-[3px] bg-black/20 dark:bg-black/45'
                        : 'opacity-0 backdrop-blur-none bg-transparent'
                }`}
            >
                <div
                    className={`relative pointer-events-auto flex flex-col items-center px-7 py-6 sm:px-9 sm:py-7 rounded-3xl transition-all duration-300 ease-out transform ${
                        showHud
                            ? 'scale-100 translate-y-0 opacity-100 shadow-[0_25px_60px_-15px_rgba(0,128,48,0.25)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]'
                            : 'scale-95 translate-y-2 opacity-0'
                    } bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-white/70 dark:border-zinc-800/80 max-w-[280px] sm:max-w-[320px] select-none`}
                >
                    {/* Background Radial Ambient Glow */}
                    <div className="absolute -top-10 w-44 h-44 rounded-full bg-emerald-500/15 dark:bg-emerald-400/10 blur-2xl pointer-events-none" />

                    {/* Emblem Showcase */}
                    <div className="relative mb-4 flex items-center justify-center">
                        {/* Outer Orbiting Gradient Ring */}
                        <div
                            className="size-20 rounded-full p-[2.5px] animate-loader-spin"
                            style={{
                                background:
                                    'conic-gradient(from 0deg, transparent 0%, #008030 40%, #10a020 70%, #f59e0b 95%, transparent 100%)',
                            }}
                        >
                            <div className="size-full rounded-full bg-white dark:bg-zinc-900" />
                        </div>

                        {/* Inner Dashed Counter-Rotating Subtle Ring */}
                        <div className="absolute inset-1 rounded-full border border-emerald-500/25 dark:border-emerald-400/20 border-dashed animate-loader-spin-reverse pointer-events-none" />

                        {/* Ambient Breathing Pulse */}
                        <div className="absolute inset-2 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 animate-loader-ambient pointer-events-none" />

                        {/* Floating Center Brand Emblem */}
                        <div className="absolute size-14 rounded-2xl bg-white/95 dark:bg-zinc-800/90 shadow-md border border-emerald-100 dark:border-zinc-700/60 flex items-center justify-center p-2.5 animate-loader-float">
                            <img
                                src="/icons/logo.png"
                                alt="MisLoan"
                                className="size-9 object-contain drop-shadow-sm"
                            />
                        </div>
                    </div>

                    {/* App Title & Financial Identity */}
                    <div className="text-center mb-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                MisLoan
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                সিস্টেম
                            </span>
                        </div>
                    </div>

                    {/* Financial Growth Pulse Line (Creative SVG Wave) */}
                    <div className="w-full px-2 py-1 mb-2.5 flex items-center justify-center">
                        <svg
                            className="w-36 h-5 overflow-visible"
                            viewBox="0 0 144 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Base guide track */}
                            <path
                                d="M 0 10 L 40 10 L 52 3 L 64 17 L 76 7 L 88 13 L 100 10 L 144 10"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="text-zinc-200 dark:text-zinc-800"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Glowing animated wave stroke */}
                            <path
                                d="M 0 10 L 40 10 L 52 3 L 64 17 L 76 7 L 88 13 L 100 10 L 144 10"
                                stroke="url(#loader-gradient)"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="160"
                                className="animate-loader-wave"
                            />
                            {/* Pulse glowing point */}
                            <circle
                                cx="76"
                                cy="7"
                                r="3"
                                fill="#10a020"
                                className="animate-ping origin-center"
                                style={{ transformOrigin: '76px 7px' }}
                            />
                            <circle cx="76" cy="7" r="2.5" fill="#f59e0b" />

                            <defs>
                                <linearGradient
                                    id="loader-gradient"
                                    x1="0"
                                    y1="0"
                                    x2="144"
                                    y2="0"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <stop stopColor="#008030" />
                                    <stop offset="0.5" stopColor="#10a020" />
                                    <stop offset="0.8" stopColor="#34d399" />
                                    <stop offset="1" stopColor="#f59e0b" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    {/* Status Message with Animated Bouncing Dots */}
                    <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <span className="tracking-normal font-sans">
                            {statusMessage}
                        </span>
                        <div className="flex items-center gap-1 ml-0.5">
                            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-loader-dot-1" />
                            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-loader-dot-2" />
                            <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-loader-dot-3" />
                        </div>
                    </div>

                    {/* Micro Progress Bar & Percentage */}
                    <div className="w-full mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        <span>প্রসেসিং</span>
                        <div className="flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-200"
                                style={{ width: `${Math.round(progress)}%` }}
                            />
                        </div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {Math.round(progress)}%
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
}
