<?php

namespace App\Services\Accounting;

use App\Models\User;
use Illuminate\Http\Request;

final class FinancialMfa
{
    public static function mark(Request $request, User $user): void
    {
        if ($request->hasSession() && $user->hasEnabledTwoFactorAuthentication()) {
            $request->session()->put('financial_mfa', ['user_id' => (int) $user->id, 'secret_hash' => hash('sha256', (string) $user->two_factor_secret)]);
        }
    }

    public static function verified(Request $request, User $user): bool
    {
        $proof = $request->session()->get('financial_mfa');

        return $user->hasEnabledTwoFactorAuthentication() && is_array($proof) && ($proof['user_id'] ?? null) === (int) $user->id
            && hash_equals(hash('sha256', (string) $user->two_factor_secret), (string) ($proof['secret_hash'] ?? ''));
    }
}
