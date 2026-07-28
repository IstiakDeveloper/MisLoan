/** Laravel XSRF-TOKEN cookie (updated every web response; preferred over stale meta tag). */
function readXsrfCookie(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

    return match?.[1] ? decodeURIComponent(match[1]) : '';
}

function readMetaCsrf(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content?.trim() ?? '';
}

/** Keep the blade meta tag aligned after Inertia navigations. */
export function syncCsrfMetaToken(token: string): void {
    if (!token || typeof document === 'undefined') {
        return;
    }

    const el = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    if (el) {
        el.content = token;
    }
}

export function jsonCsrfHeaders(): Record<string, string> {
    const xsrf = readXsrfCookie();
    if (xsrf) {
        return { 'X-XSRF-TOKEN': xsrf };
    }

    const token = readMetaCsrf();

    return token ? { 'X-CSRF-TOKEN': token } : {};
}
