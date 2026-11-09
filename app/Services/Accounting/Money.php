<?php

namespace App\Services\Accounting;

use InvalidArgumentException;

final class Money
{
    // A bounded exact representation: 1 trillion taka per individual amount.
    public const MAX_PAISA = 100_000_000_000_000;

    public static function toPaisa(string $amount): int
    {
        if (! preg_match('/^(0|[1-9][0-9]{0,12})(?:\.([0-9]{1,2}))?$/D', $amount, $parts)) {
            throw new InvalidArgumentException('Amount must be a non-negative decimal with at most two fractional digits.');
        }

        $paisa = ((int) $parts[1] * 100) + (int) str_pad($parts[2] ?? '', 2, '0');
        if ($paisa > self::MAX_PAISA) {
            throw new InvalidArgumentException('Amount exceeds the supported limit.');
        }

        return $paisa;
    }

    public static function format(int $paisa): string
    {
        if ($paisa < -self::MAX_PAISA || $paisa > self::MAX_PAISA) {
            throw new InvalidArgumentException('Amount exceeds the supported limit.');
        }

        return ($paisa < 0 ? '-' : '').intdiv(abs($paisa), 100).'.'.str_pad((string) (abs($paisa) % 100), 2, '0', STR_PAD_LEFT);
    }
}
