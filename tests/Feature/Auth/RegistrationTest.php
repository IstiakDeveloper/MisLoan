<?php

use Illuminate\Support\Facades\Route;

test('public registration is disabled for administrator-managed accounts', function () {
    expect(Route::has('register'))->toBeFalse()->and(Route::has('register.store'))->toBeFalse();
    $this->get('/register')->assertNotFound();
    $this->post('/register', ['name' => 'Uninvited', 'email' => 'uninvited@example.com', 'password' => 'password'])->assertNotFound();
    $this->assertGuest();
});
