<?php

use Illuminate\Support\Facades\Route;

it('keeps the disabled email-verification endpoints unavailable', function () {
    expect(Route::has('verification.notice'))->toBeFalse()
        ->and(Route::has('verification.verify'))->toBeFalse()
        ->and(Route::has('verification.send'))->toBeFalse();
});
