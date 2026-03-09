<?php

namespace App\Http\Middleware;

use App\Models\Role;
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

        // Allow access if:
        // - user has_all_access flag, OR
        // - user role is SUPER_ADMIN or HEAD_OFFICE
        $roleName = $user->role?->name;

        if (! $user->has_all_access && ! in_array($roleName, [Role::SUPER_ADMIN, Role::HEAD_OFFICE], true)) {
            abort(403, 'This module is only accessible to Head Office/SuperAdmin.');
        }

        return $next($request);
    }
}
