<?php

namespace App\Support;

class NumberToWordsBangla
{
    private const ZERO_TO_99 = [
        'শূন্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
        'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোল', 'সতেরো', 'আঠারো', 'উনিশ',
        'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আঠাশ', 'উনত্রিশ',
        'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ',
        'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ',
        'পঞ্চাশ', 'একান্ন', 'বাহান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট',
        'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর',
        'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনআশি',
        'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'উননব্বই',
        'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই',
    ];

    public static function convert(int|float|string|null $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        $num = is_numeric($value) ? (float) $value : (float) preg_replace('/[^\d.]/', '', (string) $value);
        if (! is_finite($num) || $num < 0) {
            return '';
        }

        $n = (int) floor($num);
        if ($n === 0) {
            return self::ZERO_TO_99[0];
        }

        return self::convertPositive($n);
    }

    private static function convertPositive(int $n): string
    {
        if ($n < 1000) {
            return self::upTo999($n);
        }

        if ($n < 100000) {
            $th = intdiv($n, 1000);
            $r = $n % 1000;
            $thousand = $th === 1 ? 'এক হাজার' : (self::upTo999($th).' হাজার');

            return trim($thousand.($r ? ' '.self::upTo999($r) : ''));
        }

        if ($n < 10000000) {
            $lkh = intdiv($n, 100000);
            $r = $n % 100000;
            $lakh = $lkh === 1 ? 'এক লক্ষ' : (self::upTo999($lkh).' লক্ষ');

            return trim($lakh.($r ? ' '.self::convertPositive($r) : ''));
        }

        $cr = intdiv($n, 10000000);
        $r = $n % 10000000;
        $crore = $cr === 1 ? 'এক কোটি' : (self::convertPositive($cr).' কোটি');

        return trim($crore.($r ? ' '.self::convertPositive($r) : ''));
    }

    private static function upTo999(int $x): string
    {
        if ($x === 0) {
            return '';
        }
        if ($x <= 99) {
            return self::ZERO_TO_99[$x];
        }

        $h = intdiv($x, 100);
        $r = $x % 100;
        $hundred = $h === 1 ? 'একশ' : (self::ZERO_TO_99[$h].'শ');

        return $r ? $hundred.' '.self::ZERO_TO_99[$r] : $hundred;
    }
}
