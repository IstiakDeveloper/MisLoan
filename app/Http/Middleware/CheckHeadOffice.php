<?php

namespace App\Http\Middleware;

use App\Models\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckHeadOffice
{
    /**
     * SuperAdmin / Head Office: full access.
     * ED / ADMF / DMF / Area / Zone managers: view access (GET only),
     * scoped to assigned zone/area in controllers when not has_all_access.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $roleName = $user->role?->name;

        $viewOnlyRoles = [
            Role::ED,
            Role::ADMF,
            Role::DMF,
            Role::AREA_MANAGER,
            Role::ZONE_MANAGER,
        ];

        $allowedRoles = array_merge(
            [Role::SUPER_ADMIN, Role::HEAD_OFFICE],
            $viewOnlyRoles
        );

        if (! $user->has_all_access && ! in_array($roleName, $allowedRoles, true)) {
            abort(403, 'This module is only accessible to Head Office, SuperAdmin, or assigned approvers/managers.');
        }

        // Organizational viewers are view-only on Head Office / configuration modules.
        if (in_array($roleName, $viewOnlyRoles, true)
            && ! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)
        ) {
            abort(403, 'You have view-only access to this module.');
        }

        return $next($request);
    }
}
