<?php

use App\Services\MemberCodeService;

it('converts bangla digits to english digits', function () {
    expect(MemberCodeService::toEnglishDigits('১২৩৪৫৬৭৮৯০'))->toBe('1234567890');
    expect(MemberCodeService::toEnglishDigits('৯৯'))->toBe('99');
    expect(MemberCodeService::toEnglishDigits('1500'))->toBe('1500');
    expect(MemberCodeService::toEnglishDigits('আবাদী (৯৯)'))->toBe('আবাদী (99)');
    expect(MemberCodeService::toEnglishDigits(null))->toBe('');
    expect(MemberCodeService::toEnglishDigits(''))->toBe('');
});

it('converts english digits to bangla digits for print display', function () {
    expect(MemberCodeService::toBengaliDigits('1234567890'))->toBe('১২৩৪৫৬৭৮৯০');
    expect(MemberCodeService::toBengaliDigits('99'))->toBe('৯৯');
    expect(MemberCodeService::toBengaliDigits('আবাদী (99)'))->toBe('আবাদী (৯৯)');
    expect(MemberCodeService::toBengaliDigits('01712345678'))->toBe('০১৭১২৩৪৫৬৭৮');
    expect(MemberCodeService::toBengaliDigits(null))->toBe('');
    expect(MemberCodeService::toBengaliDigits(''))->toBe('');
});
