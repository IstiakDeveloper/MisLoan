<?php

test('the app layout uses the brand theme color and pwa icons', function () {
    $blade = (string) file_get_contents(resource_path('views/app.blade.php'));

    expect($blade)
        ->toContain('content="#008030"')
        ->toContain('/manifest.webmanifest')
        ->toContain('/apple-touch-icon.png')
        ->toContain('/icons/icon-192.png')
        ->toContain('/icons/icon-512.png');
});

test('the web manifest uses the logo icons and brand colors', function () {
    $manifest = json_decode((string) file_get_contents(public_path('manifest.webmanifest')), true);

    expect($manifest)->toBeArray()
        ->and($manifest['name'])->toBe('MisLoan')
        ->and($manifest['short_name'])->toBe('MisLoan')
        ->and($manifest['theme_color'])->toBe('#008030')
        ->and($manifest['background_color'])->toBe('#ffffff')
        ->and($manifest['icons'])->toHaveCount(4);

    $sources = collect($manifest['icons'])->pluck('src')->all();

    expect($sources)->toContain('/icons/icon-192.png')
        ->toContain('/icons/icon-512.png')
        ->toContain('/icons/icon-192-maskable.png')
        ->toContain('/icons/icon-512-maskable.png');
});

test('generated pwa icons exist at the required sizes', function (string $path, int $size) {
    $fullPath = public_path($path);

    expect(is_file($fullPath))->toBeTrue();

    $info = getimagesize($fullPath);

    expect($info)->not->toBeFalse()
        ->and($info[0])->toBe($size)
        ->and($info[1])->toBe($size)
        ->and($info['mime'])->toBe('image/png');
})->with([
    'any 192' => ['icons/icon-192.png', 192],
    'any 512' => ['icons/icon-512.png', 512],
    'maskable 192' => ['icons/icon-192-maskable.png', 192],
    'maskable 512' => ['icons/icon-512-maskable.png', 512],
    'apple touch' => ['apple-touch-icon.png', 180],
    'favicon 32' => ['favicon-32x32.png', 32],
    'favicon 16' => ['favicon-16x16.png', 16],
]);

test('the site logo is used in the admin panel', function () {
    expect(is_file(public_path('icons/logo.png')))->toBeTrue();

    $layout = (string) file_get_contents(resource_path('js/layouts/admin-layout.tsx'));
    $login = (string) file_get_contents(resource_path('js/pages/auth/login.tsx'));

    expect($layout)->toContain('src="/icons/logo.png"')
        ->and($login)->toContain('src="/icons/logo.png"');
});
