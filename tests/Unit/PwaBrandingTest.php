<?php

test('the app layout includes complete pwa and apple head tags', function () {
    $blade = (string) file_get_contents(resource_path('views/app.blade.php'));
    $pwaHead = (string) file_get_contents(resource_path('views/partials/pwa-head.blade.php'));

    expect($blade)->toContain("@include('partials.pwa-head')");

    expect($pwaHead)
        ->toContain('content="#008030"')
        ->toContain('/manifest.webmanifest')
        ->toContain('apple-mobile-web-app-capable')
        ->toContain('apple-mobile-web-app-title')
        ->toContain('apple-touch-startup-image')
        ->toContain('/apple-touch-icon.png')
        ->toContain('/icons/apple-touch-icon-167.png')
        ->toContain('/icons/apple-touch-icon-152.png')
        ->toContain('/icons/apple-touch-icon-120.png')
        ->toContain('/icons/icon-192.png')
        ->toContain('/icons/icon-512.png')
        ->toContain('/browserconfig.xml')
        ->toContain('/splash/iphone-14-pro.png')
        ->toContain('/splash/ipad-pro-12-landscape.png');
});

test('the web manifest includes icons, screenshots, and brand colors', function () {
    $manifest = json_decode((string) file_get_contents(public_path('manifest.webmanifest')), true);

    expect($manifest)->toBeArray()
        ->and($manifest['name'])->toBe('MisLoan')
        ->and($manifest['short_name'])->toBe('MisLoan')
        ->and($manifest['theme_color'])->toBe('#008030')
        ->and($manifest['background_color'])->toBe('#ffffff')
        ->and($manifest['orientation'])->toBe('any')
        ->and($manifest['icons'])->toHaveCount(11)
        ->and($manifest['screenshots'])->toHaveCount(2);

    $iconSources = collect($manifest['icons'])->pluck('src')->all();

    expect($iconSources)
        ->toContain('/icons/icon-192.png')
        ->toContain('/icons/icon-256.png')
        ->toContain('/icons/icon-512.png')
        ->toContain('/icons/icon-192-maskable.png')
        ->toContain('/icons/icon-512-maskable.png');

    $screenshotSources = collect($manifest['screenshots'])->pluck('src')->all();

    expect($screenshotSources)
        ->toContain('/screenshots/narrow.png')
        ->toContain('/screenshots/wide.png');

    $formFactors = collect($manifest['screenshots'])->pluck('form_factor')->all();

    expect($formFactors)->toContain('narrow')->toContain('wide');
});

test('generated pwa icons exist at the required sizes', function (string $path, int $width, int $height) {
    $fullPath = public_path($path);

    expect(is_file($fullPath))->toBeTrue();

    $info = getimagesize($fullPath);

    expect($info)->not->toBeFalse()
        ->and($info[0])->toBe($width)
        ->and($info[1])->toBe($height)
        ->and($info['mime'])->toBe('image/png');
})->with([
    'any 48' => ['icons/icon-48.png', 48, 48],
    'any 96' => ['icons/icon-96.png', 96, 96],
    'any 144' => ['icons/icon-144.png', 144, 144],
    'any 192' => ['icons/icon-192.png', 192, 192],
    'any 256' => ['icons/icon-256.png', 256, 256],
    'any 512' => ['icons/icon-512.png', 512, 512],
    'maskable 192' => ['icons/icon-192-maskable.png', 192, 192],
    'maskable 512' => ['icons/icon-512-maskable.png', 512, 512],
    'apple 120' => ['icons/apple-touch-icon-120.png', 120, 120],
    'apple 152' => ['icons/apple-touch-icon-152.png', 152, 152],
    'apple 167' => ['icons/apple-touch-icon-167.png', 167, 167],
    'apple 180' => ['apple-touch-icon.png', 180, 180],
    'favicon 32' => ['favicon-32x32.png', 32, 32],
    'favicon 16' => ['favicon-16x16.png', 16, 16],
    'mstile 150' => ['icons/mstile-150x150.png', 270, 270],
    'mstile wide' => ['icons/mstile-310x150.png', 310, 150],
    'screenshot narrow' => ['screenshots/narrow.png', 1080, 1920],
    'screenshot wide' => ['screenshots/wide.png', 1920, 1080],
    'iphone splash' => ['splash/iphone-14-pro.png', 1179, 2556],
    'iphone splash landscape' => ['splash/iphone-14-pro-landscape.png', 2556, 1179],
    'ipad splash' => ['splash/ipad-pro-12.png', 2048, 2732],
]);

test('windows browserconfig points at the generated tiles', function () {
    $config = (string) file_get_contents(public_path('browserconfig.xml'));

    expect($config)
        ->toContain('/icons/mstile-70x70.png')
        ->toContain('/icons/mstile-150x150.png')
        ->toContain('/icons/mstile-310x310.png')
        ->toContain('/icons/mstile-310x150.png')
        ->toContain('#008030');
});

test('the site logo is used in the admin panel', function () {
    expect(is_file(public_path('icons/logo.png')))->toBeTrue();

    $layout = (string) file_get_contents(resource_path('js/layouts/admin-layout.tsx'));
    $login = (string) file_get_contents(resource_path('js/pages/auth/login.tsx'));

    expect($layout)->toContain('src="/icons/logo.png"')
        ->and($login)->toContain('src="/icons/logo.png"');
});
