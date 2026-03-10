import { useEffect, useState } from 'react';

declare global {
    interface BeforeInstallPromptEvent extends Event {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    }
}

export function usePwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const ua = window.navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
        const isAndroid = /Android/.test(ua);
        setPlatform(isIOS ? 'ios' : isAndroid ? 'android' : 'desktop');

        console.log('[PWA] Detected platform:', isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop');

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            console.log('[PWA] beforeinstallprompt fired, prompt saved');
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            setIsStandalone(true);
            console.log('[PWA] App already running in standalone mode');
        } else {
            setIsStandalone(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const canInstall = !!deferredPrompt && !isInstalled;

    const promptInstall = async () => {
        if (!deferredPrompt) return;
        console.log('[PWA] Calling prompt() on deferred install event');
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log('[PWA] User choice on install:', choice.outcome);
        setDeferredPrompt(null);
    };

    return { canInstall, promptInstall, isInstalled, isStandalone, platform };
}

