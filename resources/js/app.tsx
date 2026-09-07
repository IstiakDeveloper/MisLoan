import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PageLoader from './components/PageLoader';
import PwaUpdateBanner from './components/PwaUpdateBanner';
import { AuthProvider } from './contexts/AuthContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { initializeTheme } from './hooks/use-appearance';
import { syncCsrfMetaToken } from './lib/csrf';
import { stripWholeNumberDecimals } from './utils/formatAmount';

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

        // Dismiss initial HTML splash loader smoothly if present
        const initialLoader = document.getElementById('initial-page-loader');
        if (initialLoader) {
            initialLoader.style.opacity = '0';
            initialLoader.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => initialLoader.remove(), 300);
        }

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
                    <LoadingProvider>
                        <PwaUpdateBanner />
                        <PageLoader />
                        <App {...props} />
                    </LoadingProvider>
                </AuthProvider>
            </StrictMode>,
        );
    },
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();
