<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileComplete
{
    /**
     * If the user's profile is incomplete (missing phone, pin or signature),
     * redirect to the profile completion page. Allow through for the completion route itself.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            return $next($request);
        }

        if ($request->routeIs('profile.complete') || $request->routeIs('profile.complete.store')) {
            return $next($request);
        }

        if (! $request->user()->hasCompleteProfile()) {
            return redirect()->route('profile.complete');
        }

        return $next($request);
    }
}
