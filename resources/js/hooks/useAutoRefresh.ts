import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

interface AutoRefreshOptions {
    interval?: number; // in ms, default 3000
    enabled?: boolean;
}

export function useAutoRefresh<T>(
    fetchFn: () => Promise<T>,
    options: AutoRefreshOptions = {}
) {
    const { interval = 3000, enabled = true } = options;
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await fetchFn();
            setData(result);
        } catch (err: any) {
            setError(err?.message || 'خطأ في التحديث');
            console.error('Auto refresh error:', err);
        } finally {
            setLoading(false);
        }
    }, [fetchFn]);

    useEffect(() => {
        if (!enabled) return;

        // Initial fetch
        refresh();

        // Set up interval
        const timer = setInterval(refresh, interval);
        return () => clearInterval(timer);
    }, [enabled, interval, refresh]);

    return { data, loading, error, refresh };
}

export function useFetchData<T>(
    url: string,
    options: AutoRefreshOptions & {
        deps?: any[];
        params?: any;
    } = {}
) {
    const { interval = 3000, enabled = true, deps = [], params } = options;

    const fetchFn = useCallback(async () => {
        const response = await axios.get(url, { params });
        return response.data as T;
    }, [url, params]);

    const { data, loading, error, refresh } = useAutoRefresh(fetchFn, {
        interval,
        enabled,
    });

    useEffect(() => {
        refresh();
    }, deps);

    return { data, loading, error, refresh };
}
