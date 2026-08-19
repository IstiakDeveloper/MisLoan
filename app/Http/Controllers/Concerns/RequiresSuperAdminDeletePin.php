<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

trait RequiresSuperAdminDeletePin
{
    protected function superAdminPinIsValid(Request $request): bool
    {
        $pin = (string) $request->input('pin', '');
        $expected = (string) config('app.superadmin_delete_pin', '8934');

        return $pin !== '' && hash_equals($expected, $pin);
    }

    protected function denyUnlessSuperAdminPin(Request $request, string $error = 'PIN সঠিক নয়।'): ?RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            return back()->with('error', 'শুধুমাত্র সুপার অ্যাডমিন এই কাজ করতে পারবেন।');
        }

        if (! $this->superAdminPinIsValid($request)) {
            return back()->with('error', $error);
        }

        return null;
    }

    protected function denyUnlessSuperAdminDeletePin(Request $request): ?RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            return back()->with('error', 'শুধুমাত্র সুপার অ্যাডমিন মুছে ফেলতে পারবেন।');
        }

        if (! $this->superAdminPinIsValid($request)) {
            return back()->with('error', 'ডিলিট PIN সঠিক নয়।');
        }

        return null;
    }

    protected function sessionLoanEditKey(): string
    {
        return 'superadmin_loan_edit_ids';
    }

    protected function markLoanEditUnlocked(int $loanId): void
    {
        $ids = array_values(array_unique(array_merge(
            session($this->sessionLoanEditKey(), []),
            [$loanId]
        )));

        session()->put($this->sessionLoanEditKey(), $ids);
    }

    protected function isLoanEditUnlocked(int $loanId): bool
    {
        foreach (session($this->sessionLoanEditKey(), []) as $id) {
            if ((int) $id === $loanId) {
                return true;
            }
        }

        return false;
    }
}
