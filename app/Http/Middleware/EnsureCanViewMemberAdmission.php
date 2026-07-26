<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanViewMemberAdmission
{
    /**
     * Allow: users with has_all_access, branch users, or approvers when admission's branch is in their accessible branches or they are an assigned approver.
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

        // Head office / super admin can view & edit any
        if ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice()) {
            return $next($request);
        }

        // Draft privacy check: Drafts can only be accessed by the creator
        if ($admission->status === 'draft' && (int) $admission->created_by !== (int) $user->id) {
            abort(403, 'Drafts can only be accessed by the creator.');
        }

        // Check if user is an assigned approver for this admission
        $isApprover = \App\Models\MemberAdmissionApproval::where('member_admission_id', $admission->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($isApprover) {
            return $next($request);
        }

        // Check if user can access the admission's branch (via branch_id, area_id, zone_id, user_branches, user_areas, user_zones)
        if ($user->canAccessBranch((int) $admission->branch_id)) {
            return $next($request);
        }

        abort(403, 'This section is only accessible to authorized users.');
    }
}
