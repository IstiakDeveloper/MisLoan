<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePortfolioHandoverComplete
{
    /**
     * After HRM transfer, a field officer must hand over members still assigned
     * at the previous branch before using the rest of the app.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        if ($request->routeIs([
            'portfolio-handover.*',
            'logout',
            'login',
            'login.store',
            'password.*',
            'two-factor.login',
            'two-factor.login.store',
            'verification.*',
            'profile.complete',
            'profile.complete.store',
        ])) {
            return $next($request);
        }

        if ($user->needsPortfolioHandover()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'ট্রান্সফারের পর পুরনো শাখার সদস্য হস্তান্তর সম্পন্ন করতে হবে।',
                    'redirect' => route('portfolio-handover.index'),
                ], 403);
            }

            return redirect()->route('portfolio-handover.index');
        }

        return $next($request);
    }
}
