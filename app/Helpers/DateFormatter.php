<?php

namespace App\Helpers;

use Carbon\Carbon;
use DateTimeInterface;

class DateFormatter
{
    public const TIMEZONE = 'Asia/Dhaka';

    /**
     * Display date as dd/mm/YYYY in Bangladesh time.
     */
    public static function displayDate(mixed $value, string $fallback = '-'): string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        try {
            $str = is_string($value) ? trim($value) : '';
            if ($str !== '' && preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $str)) {
                return $str;
            }

            if ($str !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $str)) {
                return Carbon::createFromFormat('Y-m-d', $str, self::TIMEZONE)->format('d/m/Y');
            }

            return self::toDhaka($value)->format('d/m/Y');
        } catch (\Throwable) {
            return $fallback;
        }
    }

    /**
     * Display time as hh:mm AM/PM in Bangladesh time.
     */
    public static function displayTime(mixed $value, string $fallback = '-'): string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        try {
            return self::toDhaka($value)->format('h:i A');
        } catch (\Throwable) {
            return $fallback;
        }
    }

    /**
     * Display date + time as dd/mm/YYYY hh:mm AM/PM in Bangladesh time.
     */
    public static function displayDateTime(mixed $value, string $fallback = '-'): string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        try {
            return self::toDhaka($value)->format('d/m/Y h:i A');
        } catch (\Throwable) {
            return $fallback;
        }
    }

    private static function toDhaka(mixed $value): Carbon
    {
        $carbon = $value instanceof DateTimeInterface
            ? Carbon::instance($value)
            : Carbon::parse((string) $value);

        return $carbon->timezone(self::TIMEZONE);
    }
}
