<?php

namespace App\Support;

/**
 * Convert whole-number decimals in Inertia payloads ("0.00" → "0").
 * Leaves real fractional values like "0.5" or "12.50" unchanged.
 */
class WholeNumberDecimals
{
    public static function strip(mixed $value): mixed
    {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $key => $child) {
                $out[$key] = self::strip($child);
            }

            return $out;
        }

        if (is_string($value)) {
            $trimmed = trim($value);
            if (preg_match('/^-?\d+\.0+$/', $trimmed) === 1) {
                return (string) (int) $trimmed;
            }
        }

        return $value;
    }
}
