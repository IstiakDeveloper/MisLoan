<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use App\Services\BranchAccountService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function authenticateBranch(Request $request, BranchAccountService $branchAccounts): User
    {
        $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'pin' => 'required|string|min:4|max:12',
        ]);

        $branch = Branch::query()
            ->with(['area', 'branchUser'])
            ->where('id', $request->integer('branch_id'))
            ->where('is_active', true)
            ->first();

        if (! $branch || ! $branch->verifyLoginPin((string) $request->input('pin'))) {
            throw ValidationException::withMessages([
                'pin' => ['Invalid branch or PIN. Please try again.'],
            ]);
        }

        $user = $branch->branchUser;
        if (! $user || ! $user->isBranchAccount()) {
            $user = $branchAccounts->ensureForBranch($branch);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'pin' => ['This branch account is inactive. Contact admin.'],
            ]);
        }

        $request->session()->put([
            'branch_login' => true,
            'branch_context_id' => $branch->id,
        ]);

        return $user;
    }
}
