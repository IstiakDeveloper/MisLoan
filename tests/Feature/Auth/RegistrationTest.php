<?php

use Illuminate\Support\Facades\Route;

it('keeps public self-registration disabled', function () {
    expect(Route::has('register'))->toBeFalse();
    expect(Route::has('register.store'))->toBeFalse();
});
