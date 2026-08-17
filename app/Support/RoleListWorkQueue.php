<?php

namespace App\Support;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;

class RoleListWorkQueue
{
    public const ALL = 'all';
    public const PENDING_MY_APPROVAL = 'pending_my_approval';

    public static function defaultStatus(?User $user): ?string
    {
        if (! $user) {
            return null;
        }

        $user->loadMissing('role');

        return match ($user->role?->name) {
            Role::BRANCH_USER => 'ready_for_head_office',
            Role::BRANCH_MANAGER,
            Role::AREA_MANAGER,
            Role::ZONE_MANAGER,
            Role::ADMF,
            Role::DMF,
            Role::ED => self::PENDING_MY_APPROVAL,
            Role::HEAD_OFFICE => 'pending_head_office',
            default => null,
        };
    }

    /**
     * Missing status → role default. status=all (or empty) → show everything.
     */
    public static function resolve(Request $request, ?User $user = null): ?string
    {
        $user = $user ?? $request->user();
        $default = self::defaultStatus($user);

        if (! $request->has('status')) {
            return $default;
        }

        $status = trim((string) $request->input('status', ''));
        if ($status === '' || $status === self::ALL) {
            return null;
        }

        return $status;
    }

    public static function isWorkQueue(?string $status): bool
    {
        return in_array($status, [
            'ready_for_head_office',
            'pending_head_office',
            self::PENDING_MY_APPROVAL,
        ], true);
    }

    public static function label(?string $status): string
    {
        return match ($status) {
            'ready_for_head_office' => 'হেড অফিসে পাঠান',
            'pending_head_office' => 'হেড অফিস পেন্ডিং',
            self::PENDING_MY_APPROVAL => 'আমার অনুমোদন',
            default => 'সর্বমোট',
        };
    }

    public static function hint(?string $status): ?string
    {
        return match ($status) {
            'ready_for_head_office' => 'ডিফল্টে হেড অফিসে পাঠানোর বাকি আবেদন দেখানো হচ্ছে। সব দেখতে “সর্বমোট” চাপুন।',
            'pending_head_office' => 'ডিফল্টে হেড অফিসে পেন্ডিং আবেদন দেখানো হচ্ছে। সব দেখতে “সর্বমোট” চাপুন।',
            self::PENDING_MY_APPROVAL => 'ডিফল্টে আপনার অনুমোদনের অপেক্ষায় থাকা আবেদন দেখানো হচ্ছে। সব দেখতে “সর্বমোট” চাপুন।',
            default => null,
        };
    }

    /**
     * @return array{status: ?string, status_param: string, default_status: ?string, date_from: ?string, date_to: ?string, label: string, hint: ?string}
     */
    public static function resolveWithDates(Request $request, bool $defaultMonthDates = false, ?User $user = null): array
    {
        $user = $user ?? $request->user();
        $status = self::resolve($request, $user);
        $defaultStatus = self::defaultStatus($user);

        $hasExplicitDates = $request->exists('date_from')
            || $request->exists('date_to')
            || $request->exists('from_date')
            || $request->exists('to_date');

        if ($hasExplicitDates) {
            $dateFrom = $request->input('date_from') ?: $request->input('from_date') ?: null;
            $dateTo = $request->input('date_to') ?: $request->input('to_date') ?: null;
        } elseif ($defaultMonthDates && ! self::isWorkQueue($status)) {
            $dateFrom = now()->startOfMonth()->toDateString();
            $dateTo = now()->toDateString();
        } else {
            $dateFrom = null;
            $dateTo = null;
        }

        return [
            'status' => $status,
            'status_param' => $status ?? self::ALL,
            'default_status' => $defaultStatus,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'label' => self::label($status ?: $defaultStatus),
            'hint' => self::hint($status),
        ];
    }

    /**
     * @return array{default_status: ?string, label: string, hint: ?string}
     */
    public static function payload(array $resolved): array
    {
        return [
            'default_status' => $resolved['default_status'],
            'label' => self::label($resolved['default_status']),
            'hint' => self::hint($resolved['status']),
        ];
    }
}
