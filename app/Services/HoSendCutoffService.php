<?php

namespace App\Services;

use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;

class HoSendCutoffService
{
    public const SETTING_KEY = 'ho_send_cutoff_time';

    public const DEFAULT_TIME = '17:00';

    public const TIMEZONE = 'Asia/Dhaka';

    private const CACHE_KEY = 'settings.ho_send_cutoff_time';

    /**
     * Cutoff time as H:i in Asia/Dhaka (default 17:00).
     */
    public function time(): string
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, function () {
            return Setting::query()->where('key', self::SETTING_KEY)->value('value');
        });

        if (is_string($stored) && preg_match('/^\d{2}:\d{2}$/', $stored) === 1) {
            return $stored;
        }

        return self::DEFAULT_TIME;
    }

    public function update(string $time): void
    {
        Setting::query()->updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => $time],
        );

        Cache::forget(self::CACHE_KEY);
        Cache::forever(self::CACHE_KEY, $time);
    }

    public function isBlocked(?Carbon $at = null): bool
    {
        $now = ($at ?? now())->copy()->timezone(self::TIMEZONE);
        $cutoff = $now->copy()->setTimeFromTimeString($this->time());

        return $now->gt($cutoff);
    }

    public function label(): string
    {
        $moment = Carbon::createFromFormat('H:i', $this->time(), self::TIMEZONE);
        $hour = (int) $moment->format('G');
        $bnTime = $this->toBanglaDigits($moment->format('g:i'));

        return $this->periodName($hour).' '.$bnTime.'টা';
    }

    public function badgeLabel(): string
    {
        $moment = Carbon::createFromFormat('H:i', $this->time(), self::TIMEZONE);

        return $this->toBanglaDigits($moment->format('g:i')).' '.$moment->format('A');
    }

    public function blockedMessage(): string
    {
        return "সময়সীমা শেষ। {$this->label()}র পর শাখা থেকে হেড অফিসে আবেদন পাঠানো যাবে না। আগামীকাল আবার পাঠাতে পারবেন।";
    }

    /**
     * @return array{time: string, label: string, badge: string, is_blocked: bool, blocked_message: string}
     */
    public function toSharedArray(): array
    {
        return [
            'time' => $this->time(),
            'label' => $this->label(),
            'badge' => $this->badgeLabel(),
            'is_blocked' => $this->isBlocked(),
            'blocked_message' => $this->blockedMessage(),
        ];
    }

    public function redirectIfBlocked(): ?RedirectResponse
    {
        if (! $this->isBlocked()) {
            return null;
        }

        return back()->with('error', $this->blockedMessage());
    }

    private function periodName(int $hour): string
    {
        if ($hour >= 4 && $hour < 12) {
            return 'সকাল';
        }

        if ($hour >= 12 && $hour < 15) {
            return 'দুপুর';
        }

        if ($hour >= 15 && $hour < 18) {
            return 'বিকাল';
        }

        if ($hour >= 18 && $hour < 20) {
            return 'সন্ধ্যা';
        }

        return 'রাত';
    }

    private function toBanglaDigits(string $value): string
    {
        return strtr($value, [
            '0' => '০',
            '1' => '১',
            '2' => '২',
            '3' => '৩',
            '4' => '৪',
            '5' => '৫',
            '6' => '৬',
            '7' => '৭',
            '8' => '৮',
            '9' => '৯',
        ]);
    }
}
