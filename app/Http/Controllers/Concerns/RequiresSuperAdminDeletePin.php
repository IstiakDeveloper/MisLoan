<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

trait RequiresSuperAdminDeletePin
{
    /**
     * Verify whether the provided credential matches the authenticated user's password
     * (or legacy SuperAdmin PIN for super admins).
     */
    protected function userPasswordIsValid(Request $request): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }

        $credential = (string) ($request->input('password') ?? $request->input('pin') ?? '');
        if ($credential === '') {
            return false;
        }

        // 1. Verify user's own login password
        if (Hash::check($credential, $user->password)) {
            return true;
        }

        // 2. Backward compatibility: SuperAdmin PIN for super admins
        if ($user->isSuperAdmin()) {
            $expected = (string) config('app.superadmin_delete_pin', '8934');
            if ($expected !== '' && hash_equals($expected, $credential)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Backward-compatible alias for userPasswordIsValid
     */
    protected function superAdminPinIsValid(Request $request): bool
    {
        return $this->userPasswordIsValid($request);
    }

    /**
     * Deny unless authenticated user is Head Office or Super Admin (strictly not CSO)
     * and confirms with their valid user password.
     */
    protected function denyUnlessAuthorizedHeadOfficeUser(Request $request, string $actionName = 'মুছে ফেলতে'): ?RedirectResponse
    {
        $user = $request->user();
        if (! $user) {
            return back()->with('error', 'লগইন প্রয়োজন।');
        }

        // Strictly deny CSO
        if ($user->isCso()) {
            return back()->with('error', 'CSO ব্যবহারকারীদের এই সুবিধা ব্যবহারের অনুমতি নেই।');
        }

        if (! $user->canHeadOfficeDeleteOrEdit()) {
            return back()->with('error', "শুধুমাত্র হেড অফিস ও সুপার অ্যাডমিন {$actionName} পারবেন।");
        }

        if (! $this->userPasswordIsValid($request)) {
            return back()->with('error', 'আপনার পাসওয়ার্ড সঠিক নয়।');
        }

        return null;
    }

    protected function denyUnlessSuperAdminPin(Request $request, string $error = 'আপনার পাসওয়ার্ড সঠিক নয়।'): ?RedirectResponse
    {
        $user = $request->user();
        if (! $user) {
            return back()->with('error', 'লগইন প্রয়োজন।');
        }

        if ($user->isCso()) {
            return back()->with('error', 'CSO ব্যবহারকারীদের এই সুবিধা ব্যবহারের অনুমতি নেই।');
        }

        if (! $user->canHeadOfficeDeleteOrEdit()) {
            return back()->with('error', 'শুধুমাত্র হেড অফিস ও সুপার অ্যাডমিন এই কাজ করতে পারবেন।');
        }

        if (! $this->userPasswordIsValid($request)) {
            return back()->with('error', $error);
        }

        return null;
    }

    protected function denyUnlessSuperAdminDeletePin(Request $request): ?RedirectResponse
    {
        return $this->denyUnlessAuthorizedHeadOfficeUser($request, 'মুছে ফেলতে');
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
