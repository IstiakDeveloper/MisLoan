import { useCallback, useEffect, useRef, useState } from 'react';

const UPDATE_CHECK_MS = 30 * 60 * 1000;
const COLD_START_MS = 8_000;

export function usePwaUpdate() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const waitingWorker = useRef<ServiceWorker | null>(null);
    const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
    const applyingRef = useRef(false);

    const applyUpdate = useCallback(() => {
        if (applyingRef.current) {
            return;
        }

        const worker = waitingWorker.current;

        if (worker) {
            applyingRef.current = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
            return;
        }

        window.location.reload();
    }, []);

    const dismiss = useCallback(() => {
        setUpdateAvailable(false);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
            return;
        }

        let cancelled = false;

        const applyIfFreshEntry = () => {
            if (!waitingWorker.current) {
                return false;
            }

            if (performance.now() < COLD_START_MS) {
                applyUpdate();
                return true;
            }

            return false;
        };

        const onInstalled = (worker: ServiceWorker) => {
            if (worker.state !== 'installed' || !navigator.serviceWorker.controller) {
                return;
            }

            waitingWorker.current = worker;

            if (!applyIfFreshEntry()) {
                setUpdateAvailable(true);
            }
        };

        const trackWorker = (worker: ServiceWorker | null) => {
            if (!worker) {
                return;
            }

            worker.addEventListener('statechange', () => onInstalled(worker));
            onInstalled(worker);
        };

        const checkForUpdates = () => {
            registrationRef.current?.update().catch(() => {
                // ignore failed update checks (offline, etc.)
            });
        };

        navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
                if (cancelled) {
                    return;
                }

                registrationRef.current = registration;
                trackWorker(registration.waiting);
                trackWorker(registration.installing);
                registration.addEventListener('updatefound', () => {
                    trackWorker(registration.installing);
                });
                checkForUpdates();
            })
            .catch(() => {
                // ignore registration errors
            });

        const onVisible = () => {
            if (document.visibilityState !== 'visible') {
                return;
            }

            checkForUpdates();

            if (waitingWorker.current) {
                applyUpdate();
            }
        };

        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', checkForUpdates);
        const intervalId = window.setInterval(checkForUpdates, UPDATE_CHECK_MS);

        let refreshing = false;
        const onControllerChange = () => {
            if (refreshing) {
                return;
            }

            refreshing = true;
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', checkForUpdates);
            window.clearInterval(intervalId);
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
    }, [applyUpdate]);

    return { updateAvailable, applyUpdate, dismiss };
}
