<?php

namespace App\Services\Reporting;

use Brick\Math\BigDecimal;

final class Csv
{
    public static function money(int|string $paisa): string
    {
        return (string) BigDecimal::of((string) $paisa)->dividedBy(100, 2);
    }

    public static function text(?string $value): string
    {
        $value ??= '';

        return preg_match('/^[\s\x00-\x1F]*[=+@-]/u', $value) ? "'".$value : $value;
    }

    public static function row($out, array $row): void
    {
        fputcsv($out, $row, ',', '"', '');
    }
}
