import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface AutoFitTableContainerProps {
    children: React.ReactNode;
    /** The target minimum width (in px) at which the table looks optimal without squishing */
    minWidth?: number;
    /** Minimum allowable scale factor (e.g. 0.6 = 60%) */
    minScale?: number;
    /** Maximum allowable scale factor (e.g. 1.15 = 115%) */
    maxScale?: number;
    /** Key to persist zoom setting in localStorage */
    storageKey?: string;
    /** Header title / badge if desired */
    title?: string;
    subtitle?: string;
    extraControls?: React.ReactNode;
    className?: string;
    showFullscreenToggle?: boolean;
}

export default function AutoFitTableContainer({
    children,
    minWidth = 1200,
    minScale = 0.55,
    maxScale = 1.15,
    storageKey,
    title,
    subtitle,
    extraControls,
    className = '',
    showFullscreenToggle = true,
}: AutoFitTableContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const currentZoomRef = useRef<number>(1);

    // Initial state: Auto Fit is enabled by default
    const [isAutoFit, setIsAutoFit] = useState<boolean>(() => {
        if (storageKey) {
            const saved = localStorage.getItem(`${storageKey}_auto`);
            if (saved !== null) return saved === 'true';
        }
        return true;
    });

    const [manualScale, setManualScale] = useState<number>(() => {
        if (storageKey) {
            const saved = localStorage.getItem(`${storageKey}_scale`);
            if (saved) {
                const parsed = parseFloat(saved);
                if (!isNaN(parsed) && parsed >= minScale && parsed <= maxScale) {
                    return parsed;
                }
            }
        }
        return 1;
    });

    const [autoScale, setAutoScale] = useState<number>(1);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    // Measure available container width and calculate auto scale
    const updateScale = useCallback(() => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.clientWidth;
        if (!containerWidth || containerWidth <= 0) return;

        const tableEl = contentRef.current?.querySelector('table') as HTMLElement | null;
        const currentZoom = currentZoomRef.current || 1;

        // Calculate unscaled natural width
        let naturalWidth = minWidth;
        if (tableEl) {
            const currentScrollW = tableEl.scrollWidth;
            const naturalTableW = currentScrollW > 0 ? (currentScrollW / currentZoom) : minWidth;
            naturalWidth = Math.max(minWidth, naturalTableW);
        } else if (contentRef.current) {
            const currentScrollW = contentRef.current.scrollWidth;
            const naturalContentW = currentScrollW > 0 ? (currentScrollW / currentZoom) : minWidth;
            naturalWidth = Math.max(minWidth, naturalContentW);
        }

        // Available width with a small gutter to ensure right border and action buttons are never cut off
        const usableWidth = containerWidth - 4;

        if (naturalWidth > usableWidth) {
            // Scale down so entire table fits inside container width
            const calculatedScale = Math.min(1, Math.max(minScale, usableWidth / naturalWidth));
            const rounded = Number(calculatedScale.toFixed(2));
            setAutoScale(rounded);
            currentZoomRef.current = rounded;
        } else {
            setAutoScale(1);
            currentZoomRef.current = 1;
        }
    }, [minWidth, minScale]);

    useEffect(() => {
        updateScale();
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            updateScale();
        });
        resizeObserver.observe(container);
        if (contentRef.current) {
            resizeObserver.observe(contentRef.current);
        }

        window.addEventListener('resize', updateScale);
        const timer = setTimeout(updateScale, 100);
        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateScale);
        };
    }, [updateScale]);

    // Active scale to apply
    const activeScale = isAutoFit ? autoScale : manualScale;

    // Handle zoom changes
    const handleZoomIn = () => {
        setIsAutoFit(false);
        setManualScale((prev) => {
            const next = Math.min(maxScale, Number((prev + 0.05).toFixed(2)));
            if (storageKey) {
                localStorage.setItem(`${storageKey}_scale`, String(next));
                localStorage.setItem(`${storageKey}_auto`, 'false');
            }
            return next;
        });
    };

    const handleZoomOut = () => {
        setIsAutoFit(false);
        setManualScale((prev) => {
            const next = Math.max(minScale, Number((prev - 0.05).toFixed(2)));
            if (storageKey) {
                localStorage.setItem(`${storageKey}_scale`, String(next));
                localStorage.setItem(`${storageKey}_auto`, 'false');
            }
            return next;
        });
    };

    const handleReset100 = () => {
        setIsAutoFit(false);
        setManualScale(1);
        if (storageKey) {
            localStorage.setItem(`${storageKey}_scale`, '1');
            localStorage.setItem(`${storageKey}_auto`, 'false');
        }
    };

    const handleToggleAutoFit = () => {
        const next = !isAutoFit;
        setIsAutoFit(next);
        if (storageKey) {
            localStorage.setItem(`${storageKey}_auto`, String(next));
        }
        if (next) {
            updateScale();
        }
    };

    const toggleFullscreen = () => {
        if (!wrapperRef.current) return;
        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    useEffect(() => {
        const onFsChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
            setTimeout(updateScale, 100);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, [updateScale]);

    const percentage = Math.round(activeScale * 100);

    return (
        <div
            ref={wrapperRef}
            className={`bg-white rounded-xl shadow-xs border border-slate-200/80 transition-all ${
                isFullscreen ? 'p-4 bg-slate-50 overflow-auto h-screen' : ''
            } ${className}`}
        >
            {/* Top Toolbar / Zoom Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200/80 rounded-t-xl text-xs select-none">
                <div className="flex items-center gap-2 min-w-0">
                    {title && (
                        <span className="font-semibold text-slate-800 tracking-tight">{title}</span>
                    )}
                    {subtitle && (
                        <span className="text-[11px] text-slate-500 font-medium">{subtitle}</span>
                    )}
                    {extraControls}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 ml-auto">
                    {/* Auto Fit toggle button */}
                    <button
                        type="button"
                        onClick={handleToggleAutoFit}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition shadow-2xs border ${
                            isAutoFit
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-blue-600'
                        }`}
                        title="ডিসপ্লে সাইজ অনুযায়ী স্বয়ংক্রিয় জুম ফিট (Auto Fit to Screen)"
                    >
                        <Sparkles className={`w-3 h-3 ${isAutoFit ? 'text-amber-300' : 'text-blue-500'}`} />
                        <span>Auto Fit</span>
                        {isAutoFit && (
                            <span className="ml-0.5 text-[10px] opacity-90 font-mono">
                                ({percentage}%)
                            </span>
                        )}
                    </button>

                    {/* Manual Zoom Controls */}
                    <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs">
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            disabled={activeScale <= minScale}
                            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded disabled:opacity-30 transition"
                            title="জুম কমান (Zoom Out -)"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </button>

                        <button
                            type="button"
                            onClick={handleReset100}
                            className={`px-1.5 py-0.5 text-[10.5px] font-mono font-bold rounded transition ${
                                !isAutoFit && percentage === 100
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                            title="১০০% জুমে রিসেট করুন (Reset to 100%)"
                        >
                            {!isAutoFit ? `${percentage}%` : '100%'}
                        </button>

                        <button
                            type="button"
                            onClick={handleZoomIn}
                            disabled={activeScale >= maxScale}
                            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded disabled:opacity-30 transition"
                            title="জুম বাড়ান (Zoom In +)"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {!isAutoFit && (
                        <button
                            type="button"
                            onClick={handleReset100}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition"
                            title="রিসেট (100%)"
                        >
                            <RotateCcw className="w-3 h-3" />
                        </button>
                    )}

                    {showFullscreenToggle && (
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition"
                            title={isFullscreen ? 'ফুলস্ক্রিন থেকে বের হন' : 'ফুলস্ক্রিন ভিউ (Fullscreen)'}
                        >
                            {isFullscreen ? (
                                <Minimize2 className="w-3.5 h-3.5" />
                            ) : (
                                <Maximize2 className="w-3.5 h-3.5" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Scaled Table Container */}
            <div ref={containerRef} className="w-full overflow-x-auto relative">
                <div
                    ref={contentRef}
                    style={{
                        zoom: activeScale,
                        width: isAutoFit && activeScale < 1 ? `${Math.round(100 / activeScale)}%` : '100%',
                    } as React.CSSProperties}
                    className="origin-top-left transition-[zoom] duration-150"
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
