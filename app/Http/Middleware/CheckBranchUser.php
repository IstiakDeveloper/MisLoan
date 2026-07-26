<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckBranchUser
{
    /**
     * Handle an incoming request.
     * Allow Branch users, Regional Managers, Area Managers, Zone Managers, and any users with accessible branches.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Allow SuperAdmin / Head Office
        if ($user->has_all_access) {
            return $next($request);
        }

        // Allow users with any accessible branches (via direct branch_id, area_id, zone_id, user_branches, user_areas, user_zones)
        if ($user->getAccessibleBranches()->count() > 0) {
            return $next($request);
        }

        abort(403, 'You need a branch or area/zone assignment to access this section.');
    }
}
