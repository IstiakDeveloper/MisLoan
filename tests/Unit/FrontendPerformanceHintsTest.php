<?php

test('the root layout requests fonts with font-display swap', function () {
    $blade = (string) file_get_contents(resource_path('views/app.blade.php'));

    expect($blade)
        ->toContain('fonts.bunny.net/css?family=instrument-sans:400,500,600&display=swap')
        ->toContain('family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap')
        ->toContain("(\$page['component'] ?? '') === 'auth/login'")
        ->toContain('rel="preload" as="image" href="/icons/logo.png"');
});

test('hashed vite assets request a one-year immutable cache', function () {
    $htaccess = (string) file_get_contents(public_path('.htaccess'));

    expect($htaccess)
        ->toContain('mod_headers.c')
        ->toContain('^/build/assets/')
        ->toContain('Cache-Control')
        ->toContain('max-age=31536000')
        ->toContain('immutable');
});

test('login and auth layout logos reserve space with intrinsic dimensions', function () {
    $login = (string) file_get_contents(resource_path('js/pages/auth/login.tsx'));
    $authLayout = (string) file_get_contents(resource_path('js/layouts/auth/auth-simple-layout.tsx'));

    expect($login)
        ->toContain('src="/icons/logo.png"')
        ->toContain('width={1119}')
        ->toContain('height={1081}')
        ->toContain('fetchPriority="high"');

    expect($authLayout)
        ->toContain('src="/icons/logo.png"')
        ->toContain('width={1119}')
        ->toContain('height={1081}');
});
