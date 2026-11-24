<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserNotBlocked
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // If user is blocked
        if ($user->is_blocked) {
            // Allow account.blocked page and logout
            if ($request->routeIs('account.blocked') || $request->routeIs('logout')) {
                return $next($request);
            }

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত (Blocked) করা হয়েছে।',
                    'is_blocked' => true,
                    'redirect' => route('account.blocked'),
                ], 403);
            }

            return redirect()->route('account.blocked');
        }

        // If user is NOT blocked, but navigates to account.blocked, send them to dashboard
        if ($request->routeIs('account.blocked')) {
            return redirect()->route('dashboard');
        }

        return $next($request);
    }
}
