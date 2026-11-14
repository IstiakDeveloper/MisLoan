<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireBranchCashier
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && ($user->isFinancialAdministrator() || $user->isBranchCashier()), 403);

        return $next($request);
    }
}
