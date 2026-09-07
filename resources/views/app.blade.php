<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <title inertia>{{ str_replace('MisLoan', 'Mis Loan', config('app.name', 'Mis Loan')) }}</title>

        @include('partials.pwa-head')

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">

        @if (($page['component'] ?? '') === 'auth/login')
            <link rel="preload" as="image" href="/icons/logo.png" fetchpriority="high">
        @endif

        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        <div id="initial-page-loader" style="position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background-color:inherit;transition:opacity 0.3s ease-out;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
                <div style="position:relative;width:64px;height:64px;display:flex;align-items:center;justify-content:center;">
                    <div style="position:absolute;inset:0;border-radius:50%;border:3px solid transparent;border-top-color:#008030;border-right-color:#10a020;border-bottom-color:#f59e0b;animation:initial-spin 0.9s linear infinite;"></div>
                    <img src="/icons/logo.png" alt="MisLoan" style="width:36px;height:36px;object-fit:contain;" />
                </div>
                <div style="font-family:'Instrument Sans', sans-serif;font-weight:700;font-size:15px;letter-spacing:0.5px;color:#008030;display:flex;align-items:center;gap:6px;">
                    <span>MisLoan</span>
                </div>
            </div>
            <style>
                @keyframes initial-spin { 100% { transform: rotate(360deg); } }
            </style>
        </div>
        @inertia
    </body>
</html>
