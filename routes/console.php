<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('images:compress-existing --only-unconverted')
    ->dailyAt('02:15')
    ->withoutOverlapping()
    ->name('images-compress-existing');

Schedule::command('notifications:prune --days=15')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->name('notifications-prune');
