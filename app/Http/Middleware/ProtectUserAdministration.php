<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

final class ProtectUserAdministration
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        abort_unless($user?->is_active && ! $user->isBranchAccount(), 403);
        // Existing organizational read access remains subject to head.office.
        // Account/role changes, credentials and session revocation require a personal super-admin.
        if ($request->isMethodSafe()) {
            return $next($request);
        }
        abort_unless($user->isSuperAdmin(), 403);

        return app(RequireFinancialMfa::class)->handle($request, $next);
    }
}
