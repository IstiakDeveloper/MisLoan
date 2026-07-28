import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { AuthProvider } from './contexts/AuthContext';
import { stripWholeNumberDecimals } from './utils/formatAmount';
import { syncCsrfMetaToken } from './lib/csrf';

const rawAppName = import.meta.env.VITE_APP_NAME || 'Mis Loan';
const appName = rawAppName === 'MisLoan' ? 'Mis Loan' : rawAppName;

router.on('navigate', (event) => {
    const token = event.detail.page.props?.csrf_token;
    if (typeof token === 'string' && token !== '') {
        syncCsrfMetaToken(token);
    }
});

router.on('invalid', (event) => {
    if (event.detail.response?.status === 419) {
        event.preventDefault();
        window.location.reload();
    }
});

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // First full page load (data-page in blade): 0.00 → 0
        props.initialPage.props = stripWholeNumberDecimals(
            props.initialPage.props,
        );

        // Number input: scroll must not change value
        el.addEventListener(
            'wheel',
            (event) => {
                const target = event.target;

                if (
                    target instanceof HTMLInputElement &&
                    target.type === 'number' &&
                    document.activeElement === target
                ) {
                    target.blur();
                }
            },
            { capture: true },
        );

        root.render(
            <StrictMode>
                <AuthProvider>
                    <App {...props} />
                </AuthProvider>
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .catch(() => {
                // ignore registration errors
            });
    });
}
