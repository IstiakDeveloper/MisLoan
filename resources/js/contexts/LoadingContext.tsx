import { router } from '@inertiajs/react';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

interface LoadingContextType {
    isLoading: boolean;
    progress: number;
    statusMessage: string;
    startLoading: (message?: string) => void;
    stopLoading: () => void;
    setProgress: (value: number | ((prev: number) => number)) => void;
}

const DEFAULT_MESSAGE = 'পেজ লোড হচ্ছে...';

const LoadingContext = createContext<LoadingContextType>({
    isLoading: false,
    progress: 0,
    statusMessage: DEFAULT_MESSAGE,
    startLoading: () => {},
    stopLoading: () => {},
    setProgress: () => {},
});

export const usePageLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgressState] = useState(0);
    const [statusMessage, setStatusMessage] = useState(DEFAULT_MESSAGE);

    const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const finishTimerRef = useRef<NodeJS.Timeout | null>(null);
    const activeRequestsCount = useRef(0);

    const clearTimers = useCallback(() => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
        if (finishTimerRef.current) {
            clearTimeout(finishTimerRef.current);
            finishTimerRef.current = null;
        }
    }, []);

    const setProgress = useCallback((val: number | ((prev: number) => number)) => {
        setProgressState(val);
    }, []);

    const startProgressSimulation = useCallback(() => {
        clearTimers();
        setProgressState(18);

        // Gradually increment progress realistically up to ~92%
        progressTimerRef.current = setInterval(() => {
            setProgressState((prev) => {
                if (prev < 45) {
                    return prev + Math.random() * 12 + 6;
                } else if (prev < 75) {
                    return prev + Math.random() * 6 + 2;
                } else if (prev < 90) {
                    return prev + Math.random() * 2 + 0.5;
                }
                return prev;
            });
        }, 180);
    }, [clearTimers]);

    const startLoading = useCallback(
        (message: string = DEFAULT_MESSAGE) => {
            activeRequestsCount.current += 1;
            setStatusMessage(message);
            setIsLoading(true);
            startProgressSimulation();
        },
        [startProgressSimulation],
    );

    const stopLoading = useCallback(() => {
        activeRequestsCount.current = Math.max(0, activeRequestsCount.current - 1);
        if (activeRequestsCount.current === 0) {
            clearTimers();
            // Snap quickly to 100%
            setProgressState(100);

            finishTimerRef.current = setTimeout(() => {
                setIsLoading(false);
                setProgressState(0);
                setStatusMessage(DEFAULT_MESSAGE);
            }, 250);
        }
    }, [clearTimers]);

    // Bind automatically to Inertia Router events
    useEffect(() => {
        const removeStart = router.on('start', () => {
            startLoading(DEFAULT_MESSAGE);
        });

        const removeProgress = router.on('progress', (event) => {
            if (event.detail.progress?.percentage) {
                setProgressState(event.detail.progress.percentage);
            }
        });

        const removeFinish = () => {
            stopLoading();
        };

        const removeCancel = () => {
            stopLoading();
        };

        const removeError = () => {
            stopLoading();
        };

        const unbindFinish = router.on('finish', removeFinish);
        const unbindCancel = router.on('cancel', removeCancel);
        const unbindError = router.on('error', removeError);

        return () => {
            removeStart();
            removeProgress();
            unbindFinish();
            unbindCancel();
            unbindError();
            clearTimers();
        };
    }, [clearTimers, startLoading, stopLoading]);

    return (
        <LoadingContext.Provider
            value={{
                isLoading,
                progress,
                statusMessage,
                startLoading,
                stopLoading,
                setProgress,
            }}
        >
            {children}
        </LoadingContext.Provider>
    );
}
