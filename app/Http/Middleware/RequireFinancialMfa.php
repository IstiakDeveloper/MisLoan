<?php

namespace App\Http\Middleware;

use App\Services\Accounting\FinancialMfa;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

final class RequireFinancialMfa
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        abort_unless($user?->is_active && $user->isSuperAdmin() && ! $user->isBranchAccount(), 403);
        if (! config('security.financial_mfa_required')) {
            return $next($request);
        }
        if (! $user->hasEnabledTwoFactorAuthentication()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Confirm two-factor authentication before accessing financial workspaces.', 'setup_url' => route('two-factor.show')], 403);
            }

            return redirect()->route('two-factor.show')->with('status', 'Set up and confirm two-factor authentication before using financial workspaces.');
        }
        if (! FinancialMfa::verified($request, $user)) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Sign out and sign in with your two-factor code or recovery code before accessing financial workspaces.'], 403);
            }
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('status', 'Sign in again with your two-factor code or recovery code to access financial workspaces.');
        }

        return $next($request);
    }
}
