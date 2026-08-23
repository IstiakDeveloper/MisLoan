<?php

namespace App\Http\Controllers;

use App\Mail\BranchUsersSummaryMail;
use App\Mail\UserCredentialsMail;
use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\BranchAccountService;
use App\Services\HrmUserSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::query()
            ->with(['role', 'zone', 'area', 'branch', 'zones', 'areas', 'branches'])
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            })
            ->when($request->filled('role_id'), function ($query) use ($request) {
                $query->where('role_id', $request->integer('role_id'));
            })
            ->when($request->zone_id, function ($query, $zoneId) {
                $query->where(function ($q) use ($zoneId) {
                    $q->where('zone_id', $zoneId)
                        ->orWhereHas('zones', fn ($sq) => $sq->where('zones.id', $zoneId));
                });
            })
            ->when($request->area_id, function ($query, $areaId) {
                $query->where(function ($q) use ($areaId) {
                    $q->where('area_id', $areaId)
                        ->orWhereHas('areas', fn ($sq) => $sq->where('areas.id', $areaId));
                });
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where(function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                        ->orWhereHas('branches', fn ($sq) => $sq->where('branches.id', $branchId));
                });
            })
            ->when($request->filled('is_active'), function ($query) use ($request) {
                $isActive = $request->input('is_active') === '1';
                $query->where('is_active', $isActive);
            })
            ->latest()
            ->paginate($request->integer('per_page', 50))
            ->withQueryString();

        $roles = Role::select(['id', 'name', 'display_name'])->get();
        $zones = Zone::where('is_active', true)->get(['id', 'name', 'code']);
        $areas = Area::where('is_active', true)->get(['id', 'name', 'code', 'zone_id']);
        $branches = Branch::where('is_active', true)->orderedByCode()->get(['id', 'name', 'code', 'area_id']);

        $stats = [
            'total' => User::count(),
            'active' => User::where('is_active', true)->count(),
            'inactive' => User::where('is_active', false)->count(),
            'super_admins' => User::where('has_all_access', true)->count(),
        ];

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
            'stats' => $stats,
            'filters' => $request->only(['search', 'role_id', 'zone_id', 'area_id', 'branch_id', 'is_active']),
            'hrmSyncEnabled' => app(HrmUserSyncService::class)->isConfigured(),
        ]);
    }

    public function syncFromHrm(HrmUserSyncService $hrmUserSyncService)
    {
        if (! $hrmUserSyncService->isConfigured()) {
            return redirect()->route('users.index')
                ->with('error', 'HRM sync is not configured. Set HRM_API_URL and HRM_API_TOKEN in .env.');
        }

        try {
            $stats = $hrmUserSyncService->sync();
        } catch (\Throwable $e) {
            return redirect()->route('users.index')
                ->with('error', 'HRM user sync failed: '.$e->getMessage());
        }

        $message = sprintf(
            'Field officers synced from HRM. Created: %d, Updated: %d, Deactivated: %d, Skipped: %d. Branch PINs updated: %d.',
            $stats['created'],
            $stats['updated'],
            $stats['deactivated'],
            $stats['skipped'],
            $stats['branch_pins_updated'] ?? 0,
        );

        return redirect()->route('users.index')
            ->with('success', $message);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20|unique:users,phone',
            'password' => ['required', 'confirmed', Password::defaults()],
            'role_id' => 'required|exists:roles,id',
            'zone_id' => 'nullable|exists:zones,id',
            'area_id' => 'nullable|exists:areas,id',
            'branch_id' => 'nullable|exists:branches,id',
            'zone_ids' => 'nullable|array',
            'zone_ids.*' => 'exists:zones,id',
            'area_ids' => 'nullable|array',
            'area_ids.*' => 'exists:areas,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'exists:branches,id',
            'is_active' => 'boolean',
            'has_all_access' => 'boolean',
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => $validated['password'],
            'role_id' => $validated['role_id'],
            'zone_id' => $validated['zone_id'] ?? null,
            'area_id' => $validated['area_id'] ?? null,
            'branch_id' => $validated['branch_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'has_all_access' => $validated['has_all_access'] ?? false,
        ]);

        // Sync multi-assignments
        if (! empty($validated['zone_ids'])) {
            $user->zones()->sync($validated['zone_ids']);
        }
        if (! empty($validated['area_ids'])) {
            $user->areas()->sync($validated['area_ids']);
        }
        if (! empty($validated['branch_ids'])) {
            $user->branches()->sync($validated['branch_ids']);
        }

        return redirect()->route('users.index')
            ->with('success', 'User created successfully.');
    }

    public function update(Request $request, User $user)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,'.$user->id,
            'email' => 'required|string|email|max:255|unique:users,email,'.$user->id,
            'phone' => 'nullable|string|max:20|unique:users,phone,'.$user->id,
            'password' => $user->isBranchAccount()
                ? BranchAccountService::loginPinRules(required: false)
                : ['nullable', 'confirmed', Password::defaults()],
            'role_id' => 'required|exists:roles,id',
            'zone_id' => 'nullable|exists:zones,id',
            'area_id' => 'nullable|exists:areas,id',
            'branch_id' => 'nullable|exists:branches,id',
            'zone_ids' => 'nullable|array',
            'zone_ids.*' => 'exists:zones,id',
            'area_ids' => 'nullable|array',
            'area_ids.*' => 'exists:areas,id',
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => 'exists:branches,id',
            'is_active' => 'boolean',
            'has_all_access' => 'boolean',
        ];

        // Only super admin / full-access users can update another user's signature
        if (Auth::user()?->has_all_access) {
            $rules['signature'] = 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048';
        }

        $validated = $request->validate($rules, $user->isBranchAccount() ? BranchAccountService::loginPinMessages() : []);

        $plainPassword = $validated['password'] ?? null;
        unset($validated['password']);

        // Handle signature upload for super admin / full-access users
        if (Auth::user()?->has_all_access && $request->hasFile('signature')) {
            if ($user->signature) {
                Storage::disk('public')->delete($user->signature);
            }
            $validated['signature'] = $request->file('signature')->store('signatures/users', 'public');
        }

        $updateData = [
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role_id' => $validated['role_id'],
            'zone_id' => $validated['zone_id'] ?? null,
            'area_id' => $validated['area_id'] ?? null,
            'branch_id' => $validated['branch_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'has_all_access' => $validated['has_all_access'] ?? false,
        ];

        if (isset($validated['signature'])) {
            $updateData['signature'] = $validated['signature'];
        }

        $user->update($updateData);

        if (filled($plainPassword)) {
            app(BranchAccountService::class)->updatePasswordOrPin($user, $plainPassword);
        }

        // Sync multi-assignments
        $user->zones()->sync($validated['zone_ids'] ?? []);
        $user->areas()->sync($validated['area_ids'] ?? []);
        $user->branches()->sync($validated['branch_ids'] ?? []);

        return redirect()->route('users.index')
            ->with('success', 'User updated successfully.');
    }

    public function destroy(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->with('error', 'Cannot delete your own account.');
        }

        $user->delete();

        return redirect()->route('users.index')
            ->with('success', 'User deleted successfully.');
    }

    public function toggleStatus(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->with('error', 'Cannot deactivate your own account.');
        }

        $user->update(['is_active' => ! $user->is_active]);

        return back()->with('success', 'User status updated successfully.');
    }

    public function resetPassword(Request $request, User $user)
    {
        $validated = $request->validate(
            [
                'password' => $user->isBranchAccount()
                    ? BranchAccountService::loginPinRules()
                    : ['required', 'confirmed', Password::defaults()],
            ],
            $user->isBranchAccount() ? BranchAccountService::loginPinMessages() : [],
        );

        app(BranchAccountService::class)->updatePasswordOrPin($user, $validated['password']);

        $message = $user->isBranchAccount()
            ? 'Branch login PIN reset successfully.'
            : 'Password reset successfully.';

        return back()->with('success', $message);
    }

    public function sendCredentials(User $user)
    {
        if (! $user->email) {
            return back()->with('error', 'User does not have an email address.');
        }

        $plainPassword = '12345678';

        try {
            Mail::to($user->email)->send(new UserCredentialsMail($user, $plainPassword));

            return back()->with('success', 'Login credentials email sent.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Mail failed: '.$e->getMessage());
        }
    }

    public function sendCredentialsToAll(Request $request)
    {
        $plainPassword = '12345678';

        $query = User::whereNotNull('email')->where('is_active', true);

        $excludeRoleIds = $request->input('exclude_role_ids', []);
        if (! empty($excludeRoleIds)) {
            $query->whereNotIn('role_id', $excludeRoleIds);
        }

        $users = $query->get();
        $sent = 0;
        $lastError = null;

        foreach ($users as $user) {
            try {
                Mail::to($user->email)->send(new UserCredentialsMail($user, $plainPassword));
                $sent++;
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();
            }
        }

        if ($sent === $users->count()) {
            return back()->with('success', "Login credentials sent to {$sent} user(s).");
        }
        if ($sent > 0) {
            return back()->with('error', "Sent to {$sent}/{$users->count()} users. Last error: ".($lastError ?? 'unknown'));
        }

        return back()->with('error', 'No mail sent. Error: '.($lastError ?? 'Check MAIL_* in .env and /clear'));
    }

    public function sendBranchSummary(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'email' => 'nullable|email',
            'all_branches' => 'sometimes|boolean',
        ]);

        $allBranches = $validated['all_branches'] ?? false;

        if ($allBranches) {
            $branches = Branch::with(['users.role'])
                ->where('is_active', true)
                ->get();

            $totalSent = 0;
            $skipped = 0;

            foreach ($branches as $branch) {
                $users = $branch->users()
                    ->whereHas('role', function ($q) {
                        $q->whereIn('name', ['branch_manager', 'branch_user', 'field_officer']);
                    })
                    ->orderBy('role_id')
                    ->orderBy('name')
                    ->get();

                if ($users->isEmpty() || ! $branch->email) {
                    $skipped++;

                    continue;
                }

                try {
                    Mail::to($branch->email)->send(new BranchUsersSummaryMail($branch, $users));
                    $totalSent++;
                } catch (\Throwable $e) {
                    // Continue with other branches; collect minimal info
                    $skipped++;
                }
            }

            if ($totalSent > 0) {
                return back()->with(
                    'success',
                    "Branch user summary email sent for {$totalSent} branch(es).".
                    ($skipped > 0 ? " Skipped {$skipped} branch(es) (no email/users)." : '')
                );
            }

            return back()->with('error', 'No branch user summary email sent. Please ensure branches have email and users.');
        }

        if (empty($validated['branch_id'])) {
            return back()->with('error', 'Please select a branch.');
        }

        $branch = Branch::with(['users.role'])->findOrFail($validated['branch_id']);

        $users = $branch->users()
            ->whereHas('role', function ($q) {
                $q->whereIn('name', ['branch_manager', 'branch_user', 'field_officer']);
            })
            ->orderBy('role_id')
            ->orderBy('name')
            ->get();

        if ($users->isEmpty()) {
            return back()->with('error', 'No branch users (Branch Manager / Branch User / Field Officer) found for this branch.');
        }

        $toEmail = $validated['email'] ?? $branch->email;

        if (! $toEmail) {
            return back()->with('error', 'No target email address provided and branch email not set.');
        }

        try {
            Mail::to($toEmail)->send(new BranchUsersSummaryMail($branch, $users));

            return back()->with(
                'success',
                "Branch user summary email sent to {$toEmail} for branch {$branch->name}."
            );
        } catch (\Throwable $e) {
            return back()->with('error', 'Mail failed: '.$e->getMessage());
        }
    }

    /**
     * Update only the user's signature (Super Admin / Head Office via separate button).
     */
    public function updateSignature(Request $request, User $user)
    {
        $actor = Auth::user();

        if (! $actor || ! $actor->has_all_access) {
            abort(403, 'Only Super Admin can update user signatures.');
        }

        $validated = $request->validate([
            'signature' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($request->hasFile('signature')) {
            if ($user->signature) {
                Storage::disk('public')->delete($user->signature);
            }

            $path = $request->file('signature')->store('signatures/users', 'public');
            $user->update(['signature' => $path]);
        }

        return back()->with('success', 'User signature updated successfully.');
    }
}
