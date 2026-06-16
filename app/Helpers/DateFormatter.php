<?php

namespace App\Helpers;

use Carbon\Carbon;
use DateTimeInterface;

class DateFormatter
{
    /**
     * Display date as dd/mm/YYYY (Bangladesh format).
     */
    public static function displayDate(mixed $value, string $fallback = '-'): string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        try {
            if ($value instanceof DateTimeInterface) {
                return Carbon::instance($value)->format('d/m/Y');
            }

            $str = trim((string) $value);
            if ($str === '') {
                return $fallback;
            }

            if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $str)) {
                return $str;
            }

            return Carbon::parse($str)->format('d/m/Y');
        } catch (\Throwable) {
            return $fallback;
        }
    }

    /**
     * Display date + time as dd/mm/YYYY hh:mm AM/PM.
     */
    public static function displayDateTime(mixed $value, string $fallback = '-'): string
    {
        if ($value === null || $value === '') {
            return $fallback;
        }

        try {
            $carbon = $value instanceof DateTimeInterface
                ? Carbon::instance($value)
                : Carbon::parse((string) $value);

            return $carbon->format('d/m/Y h:i A');
        } catch (\Throwable) {
            return $fallback;
        }
    }
}
