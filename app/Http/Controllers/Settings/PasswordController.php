<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Services\BranchAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /**
     * Show the user's password settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/password', [
            'isBranchAccount' => $request->user()?->isBranchAccount() ?? false,
        ]);
    }

    /**
     * Update the user's password, or the branch login PIN for branch accounts.
     */
    public function update(PasswordUpdateRequest $request, BranchAccountService $branchAccounts): RedirectResponse
    {
        $user = $request->user();
        $branchAccounts->updatePasswordOrPin($user, $request->validated('password'));

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $message = $user->isBranchAccount()
            ? 'Branch login PIN updated successfully. Please log in with your new PIN.'
            : 'Password updated successfully. Please log in with your new password.';

        return redirect()->route('login')
            ->with('status', $message)
            ->with('success', $message);
    }
}
