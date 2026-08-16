<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

trait RequiresSuperAdminDeletePin
{
    protected function denyUnlessSuperAdminDeletePin(Request $request): ?RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            return back()->with('error', 'শুধুমাত্র সুপার অ্যাডমিন মুছে ফেলতে পারবেন।');
        }

        $pin = (string) $request->input('pin', '');
        $expected = (string) config('app.superadmin_delete_pin', '8934');

        if ($pin === '' || ! hash_equals($expected, $pin)) {
            return back()->with('error', 'ডিলিট PIN সঠিক নয়।');
        }

        return null;
    }
}
