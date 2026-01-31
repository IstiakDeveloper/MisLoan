<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckHeadOffice
{
    /**
     * Handle an incoming request.
     * Only SuperAdmin/Head Office can access (not Branch users)
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Only SuperAdmin/Head Office with has_all_access (from users table, not roles)
        if (!$user->has_all_access) {
            abort(403, 'This module is only accessible to Head Office/SuperAdmin.');
        }

        return $next($request);
    }
}
