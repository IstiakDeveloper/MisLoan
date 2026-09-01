<?php

use App\Helpers\DateFormatter;
use Carbon\Carbon;

it('uses asia dhaka as the application timezone', function () {
    expect(config('app.timezone'))->toBe('Asia/Dhaka')
        ->and(now()->timezoneName)->toBe('Asia/Dhaka');
});

it('formats a bangladesh posting time in 12-hour am/pm without adding six hours', function () {
    $posted = Carbon::parse('2026-08-19 19:58:25', 'Asia/Dhaka');

    expect(DateFormatter::displayDateTime($posted))->toBe('19/08/2026 07:58 PM')
        ->and(DateFormatter::displayTime($posted))->toBe('07:58 PM')
        ->and(DateFormatter::displayDate($posted))->toBe('19/08/2026');
});

it('converts a utc instant to bangladesh 12-hour time', function () {
    $utc = Carbon::parse('2026-09-01 13:15:26', 'UTC');

    expect(DateFormatter::displayDateTime($utc))->toBe('01/09/2026 07:15 PM');
});

it('serializes eloquent timestamps as the true utc instant so the ui can show dhaka time', function () {
    $posted = Carbon::parse('2026-08-19 19:58:25', 'Asia/Dhaka');

    expect($posted->toJSON())->toBe('2026-08-19T13:58:25.000000Z');
});
