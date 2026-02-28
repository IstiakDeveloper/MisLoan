<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanViewMemberAdmission
{
    /**
     * Allow: users with has_all_access, branch users (branch_id or user_branches), or approvers when admission's branch is in their accessible branches.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $admission = $request->route('memberAdmission');

        if (!$admission instanceof \App\Models\MemberAdmission) {
            return $next($request);
        }

        // Head office / super admin can view any
        if ($user->has_all_access) {
            return $next($request);
        }

        // Branch user: must have branch access (direct branch_id or user_branches)
        if ($user->branch_id) {
            if ((int) $user->branch_id !== (int) $admission->branch_id) {
                abort(403, 'This section is only accessible to Branch users.');
            }
            return $next($request);
        }

        $hasBranches = \Illuminate\Support\Facades\DB::table('user_branches')
            ->where('user_id', $user->id)
            ->exists();

        if (!$hasBranches) {
            abort(403, 'This section is only accessible to Branch users.');
        }

        // User has approver role(s): admission's branch must be in user's accessible branches
        $accessibleBranchIds = $user->getAccessibleBranches()->pluck('id');
        if (!$accessibleBranchIds->contains($admission->branch_id)) {
            abort(403, 'This section is only accessible to Branch users.');
        }

        return $next($request);
    }
}
