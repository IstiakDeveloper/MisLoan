<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

final class RequireFinancialAdministrator
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        abort_unless($user?->is_active && $user->isSuperAdmin() && ! $user->isBranchAccount(), 403);

        return $next($request);
    }
}
