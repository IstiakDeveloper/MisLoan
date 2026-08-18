<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCanViewMemberAdmission
{
    /**
     * Allow: users with has_all_access, or anyone whose accessible branches include the admission's branch,
     * or an assigned approver for this admission.
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

        // Check if user is an assigned approver for this admission
        $isApprover = \App\Models\MemberAdmissionApproval::where('member_admission_id', $admission->id)
            ->where('user_id', $user->id)
            ->exists();

        if ($isApprover) {
            return $next($request);
        }

        // Branch staff (including field officers) see all admissions of their branch
        if ($user->canAccessBranch((int) $admission->branch_id)) {
            return $next($request);
        }

        abort(403, 'This section is only accessible to authorized users.');
    }
}
