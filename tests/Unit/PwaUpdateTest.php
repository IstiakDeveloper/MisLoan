<?php

test('the service worker waits for an update confirmation after the first install', function () {
    $sw = (string) file_get_contents(public_path('sw.js'));

    expect($sw)
        ->toContain("CACHE_NAME = 'mis-loan-v6'")
        ->toContain("event.data.type === 'SKIP_WAITING'")
        ->toContain('self.skipWaiting()')
        ->toContain("path === '/sw.js'")
        ->toContain("path === '/manifest.webmanifest'");
});

test('the app registers a pwa update banner and checks for updates on launch', function () {
    $app = (string) file_get_contents(resource_path('js/app.tsx'));
    $hook = (string) file_get_contents(resource_path('js/hooks/usePwaUpdate.ts'));
    $banner = (string) file_get_contents(resource_path('js/components/PwaUpdateBanner.tsx'));

    expect($app)
        ->toContain('PwaUpdateBanner')
        ->not->toContain("register('/sw.js')");

    expect($hook)
        ->toContain("register('/sw.js')")
        ->toContain('registrationRef.current?.update()')
        ->toContain('visibilitychange')
        ->toContain("type: 'SKIP_WAITING'")
        ->toContain('controllerchange');

    expect($banner)
        ->toContain('নতুন আপডেট আছে')
        ->toContain('আপডেট');
});
