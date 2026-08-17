import { useEffect, useLayoutEffect, useCallback } from 'react';

/**
 * Physical A4 Dimensions at standard 96 DPI:
 * Total A4 Height = 297mm ≈ 1122.5px
 * With 8mm margins top and bottom (16mm total ≈ 60.5px):
 * Printable Height ≈ 281mm ≈ 1062px
 */
const A4_PRINTABLE_HEIGHT_PX = 1062;

/**
 * Utility to auto-fit / auto-scale any multi-page print document so each page
 * strictly stays within 1 single A4 sheet without spilling over into an extra page.
 * If the content is within the normal A4 height, it stays 100% full size.
 * It ONLY scales down if the content exceeds the A4 sheet height.
 */
export function autoFitPrintPages(containerSelector = '.print-container, .loan-approval-print'): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const containers = document.querySelectorAll<HTMLElement>(containerSelector);
    containers.forEach((container) => {
        const pages = container.querySelectorAll<HTMLElement>('.print-page-sheet, [data-print-page]');
        pages.forEach((page) => {
            const content = page.querySelector<HTMLElement>('.print-page-content');
            if (!content) return;

            // Reset transform first to measure natural unscaled height
            content.style.transform = 'none';
            content.style.webkitTransform = 'none';
            content.style.transformOrigin = 'top left';
            content.style.webkitTransformOrigin = 'top left';
            content.style.width = '100%';
            content.style.marginLeft = '0';
            content.style.marginRight = '0';

            // In screen preview, if the parent column is narrow (< 650px), content wraps artificially.
            // Avoid false down-scaling on screen so text remains fully legible.
            const isNarrowScreenPreview = page.clientWidth > 0 && page.clientWidth < 650;
            if (isNarrowScreenPreview) {
                return;
            }

            // Use the physical A4 printable height as reference
            const naturalHeight = content.scrollHeight || content.offsetHeight;

            // Only scale down if the content ACTUALLY exceeds the full A4 printable height
            if (naturalHeight > A4_PRINTABLE_HEIGHT_PX + 5) {
                const scale = (A4_PRINTABLE_HEIGHT_PX - 8) / naturalHeight;
                // Clamp scale factor gently between 0.88 and 1.0
                const safeScale = Math.max(0.88, Math.min(1, Number(scale.toFixed(3))));

                const scaledWidth = 100 / safeScale;

                content.style.transform = `scale(${safeScale})`;
                content.style.webkitTransform = `scale(${safeScale})`;
                content.style.transformOrigin = 'top left';
                content.style.webkitTransformOrigin = 'top left';
                content.style.width = `${scaledWidth.toFixed(2)}%`;
                content.style.marginLeft = '0';
                content.style.marginRight = '0';
            } else {
                // Keep 100% full natural size
                content.style.transform = 'none';
                content.style.webkitTransform = 'none';
                content.style.transformOrigin = 'top left';
                content.style.webkitTransformOrigin = 'top left';
                content.style.width = '100%';
                content.style.marginLeft = '0';
                content.style.marginRight = '0';
            }
        });
    });
}

/**
 * Safe print trigger that calculates auto-fit right before opening the print dialog
 */
export function triggerPrintWithAutoFit(containerSelector = '.print-container, .loan-approval-print'): void {
    if (typeof window === 'undefined') return;
    autoFitPrintPages(containerSelector);
    setTimeout(() => {
        window.print();
    }, 60);
}

/**
 * React hook to automatically ensure print pages are auto-fitted when data changes
 * or right before browser print triggers.
 */
export function useAutoFitPrint(deps: any[] = [], containerSelector = '.print-container, .loan-approval-print') {
    const handleFit = useCallback(() => {
        autoFitPrintPages(containerSelector);
    }, [containerSelector]);

    useLayoutEffect(() => {
        handleFit();
        const t1 = setTimeout(handleFit, 100);
        return () => {
            clearTimeout(t1);
        };
    }, [handleFit, ...deps]);

    useEffect(() => {
        const onBeforePrint = () => {
            handleFit();
        };
        window.addEventListener('beforeprint', onBeforePrint);
        window.addEventListener('resize', handleFit);

        return () => {
            window.removeEventListener('beforeprint', onBeforePrint);
            window.removeEventListener('resize', handleFit);
        };
    }, [handleFit]);

    return { autoFitNow: handleFit, printWithAutoFit: () => triggerPrintWithAutoFit(containerSelector) };
}
