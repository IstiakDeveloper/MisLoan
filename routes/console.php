<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Existing image conversions delete the original before database references
// are updated. Keep that bulk operation out of unattended scheduling.

Schedule::command('notifications:digest')
    ->dailyAt('18:00')
    ->withoutOverlapping()
    ->name('notifications-digest');

Schedule::command('notifications:prune --days=15')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->name('notifications-prune');

Schedule::command('hrm:sync-organization')
    ->dailyAt('04:00')
    ->withoutOverlapping()
    ->name('hrm-sync-organization');

Schedule::command('finance:flag-overdue')
    ->dailyAt('08:00')
    ->timezone('Asia/Dhaka')
    ->withoutOverlapping()
    ->name('finance-flag-overdue');

Schedule::command('finance:check-ledgers')
    ->dailyAt('23:45')
    ->timezone('Asia/Dhaka')
    ->withoutOverlapping()
    ->name('finance-check-ledgers');
