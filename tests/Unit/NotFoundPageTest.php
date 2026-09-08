<?php

use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

it('renders the designed 404 page with a home link', function () {
    $this->get('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('errors/404')
            ->where('message', null)
        );
});

it('shows a custom abort message on the 404 page', function () {
    Route::get('/testing/missing-member', function () {
        abort(404, 'Member is missing.');
    });

    $this->get('/testing/missing-member')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('errors/404')
            ->where('message', 'Member is missing.')
        );
});

it('keeps api 404 responses as json', function () {
    $this->getJson('/api/this-page-does-not-exist')
        ->assertNotFound()
        ->assertJsonStructure(['message']);
});

it('includes a home button on the 404 page', function () {
    $page = (string) file_get_contents(resource_path('js/pages/errors/404.tsx'));

    expect($page)
        ->toContain("import { home } from '@/routes'")
        ->toContain('<Link href={home()}>')
        ->toContain('Home');
});
