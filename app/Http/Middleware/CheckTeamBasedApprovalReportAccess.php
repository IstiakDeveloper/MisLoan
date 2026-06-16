<?php

namespace App\Http\Middleware;

use App\Models\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTeamBasedApprovalReportAccess
{
    /**
     * Team Based Approval report: Head Office, SuperAdmin, and ED only.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $roleName = $user->role?->name;

        $allowed = $user->has_all_access
            || in_array($roleName, [Role::SUPER_ADMIN, Role::HEAD_OFFICE, Role::ED], true);

        if (! $allowed) {
            abort(403, 'This report is only accessible to Head Office, SuperAdmin, or ED.');
        }

        return $next($request);
    }
}
