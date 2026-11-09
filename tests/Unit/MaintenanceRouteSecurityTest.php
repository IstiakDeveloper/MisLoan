<?php

use Illuminate\Support\Facades\Route;

it('does not register web-accessible server maintenance commands', function () {
    foreach (Route::getRoutes() as $route) {
        expect($route->uri())->not->toBeIn(['migrate', 'clear', 'storage-link']);
    }
});
