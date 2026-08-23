<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Services\BranchAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $branchAccounts->updatePasswordOrPin($request->user(), $request->validated('password'));

        return back();
    }
}
