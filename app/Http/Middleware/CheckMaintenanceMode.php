<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * If site maintenance is on, show maintenance page unless:
     * - User is super admin (can always access)
     * - Route is login, logout, or maintenance toggle
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! Cache::get('site_maintenance', false)) {
            return $next($request);
        }

        $user = $request->user();
        if ($user && $user->isSuperAdmin()) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();
        $allow = in_array($routeName, [
            // Public + auth entry routes that should always work
            'home',                // root URL, used by PWA start_url
            'login',
            'login.store',
            'two-factor.login',
            'two-factor.login.store',
            'logout',

            // Super admin control endpoint
            'admin.maintenance.toggle',
        ], true);

        if ($allow) {
            return $next($request);
        }

        return response()->view('maintenance', [], 503);
    }
}
