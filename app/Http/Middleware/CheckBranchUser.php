<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class CheckBranchUser
{
    /**
     * Handle an incoming request.
     * Only Branch users can access loan module (not SuperAdmin/Head Office)
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Block SuperAdmin and Head Office users (check directly without loading role)
        if ($user->has_all_access) {
            abort(403, 'Loan module is only accessible to Branch users.');
        }

        // Block users without any branch assignment (check directly without query)
        if (!$user->branch_id) {
            // Only check branches() if no direct branch_id
            $hasBranches = DB::table('user_branches')
                ->where('user_id', $user->id)
                ->exists();

            if (!$hasBranches) {
                abort(403, 'You need a branch assignment to access loan module.');
            }
        }

        return $next($request);
    }
}
