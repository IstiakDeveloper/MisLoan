<?php

namespace App\Http\Middleware;

use App\Models\MemberAdmission;
use App\Models\MemberAdmissionApproval;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanViewMemberAdmission
{
    /**
     * Allow: users with has_all_access, branch staff of the admission's branch
     * (including field officers of that branch), or an assigned approver.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $admission = $request->route('memberAdmission');

        if (! $admission instanceof MemberAdmission) {
            return $next($request);
        }

        // Head office / super admin can view & edit any
        if ($user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice()) {
            return $next($request);
        }

        // Check if user is an assigned approver for this admission
        $isApprover = MemberAdmissionApproval::where('member_admission_id', $admission->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($isApprover) {
            return $next($request);
        }

        if (! $admission->isOnAccessibleBranchFor($user)) {
            abort(403, 'This section is only accessible to authorized users.');
        }

        return $next($request);
    }
}
