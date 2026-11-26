<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class EnsureBranchAccountingEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice()) {
            return $next($request);
        }

        if (! $user->branch_id) {
            return $next($request);
        }

        if (Schema::hasColumn('branches', 'accounting_enabled')
            && ! (bool) Branch::whereKey((int) $user->branch_id)->value('accounting_enabled')) {
            abort(403, 'এই শাখায় এখনো একাউন্টিং ও হিসাব-নিকাশ মোড চালু করা হয়নি।');
        }

        return $next($request);
    }
}
