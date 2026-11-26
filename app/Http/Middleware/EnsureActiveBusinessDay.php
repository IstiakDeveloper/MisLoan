<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use App\Services\AccountingPeriodService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveBusinessDay
{
    public function __construct(private readonly AccountingPeriodService $accountingPeriods) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || $user->has_all_access || $user->isSuperAdmin() || $user->isHeadOffice()) {
            return $next($request);
        }

        $branchId = $user->branch_id ? (int) $user->branch_id : null;
        if (! $branchId) {
            return $next($request);
        }

        if (Schema::hasColumn('branches', 'accounting_enabled')
            && ! (bool) Branch::whereKey($branchId)->value('accounting_enabled')) {
            return $next($request);
        }

        $state = $this->accountingPeriods->getBranchDayState($branchId);
        if (! $state || ! ($state['has_open_day'] ?? false)) {
            $message = 'আজকের কর্মদিবস এখনো খোলা (Day Open) হয়নি। অনুগ্রহ করে Process -> Start Work Process থেকে দিন শুরু করুন।';

            if ($request->expectsJson()) {
                return response()->json(['message' => $message], 422);
            }

            return redirect()->route('branch.process.index')->with('warning', $message);
        }

        $request->attributes->set('active_business_date', $state['business_date']);

        return $next($request);
    }
}
