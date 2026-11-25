<?php

use Illuminate\Support\Facades\Route;

it('keeps email verification pages disabled', function () {
    expect(Route::has('verification.notice'))->toBeFalse();
    expect(Route::has('verification.verify'))->toBeFalse();
});
