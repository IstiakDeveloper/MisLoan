<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class NavBadgeCache
{
    public const VERSION_KEY = 'nav-badges:version';

    public static function version(): int
    {
        return max(1, (int) Cache::get(self::VERSION_KEY, 1));
    }

    public static function bump(): void
    {
        if (! Cache::has(self::VERSION_KEY)) {
            Cache::forever(self::VERSION_KEY, 1);
        }

        Cache::increment(self::VERSION_KEY);
    }

    public static function key(int $userId): string
    {
        return 'nav-badges:v'.self::version().':'.$userId;
    }
}
