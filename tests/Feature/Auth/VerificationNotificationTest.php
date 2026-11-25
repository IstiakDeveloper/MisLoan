<?php

use Illuminate\Support\Facades\Route;

it('keeps email verification notifications disabled', function () {
    expect(Route::has('verification.send'))->toBeFalse();
});
