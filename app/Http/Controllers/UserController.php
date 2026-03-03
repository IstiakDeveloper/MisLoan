<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\Zone;
use App\Models\Area;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
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
            ->when($request->role_id, function ($query, $roleId) {
                $query->where('role_id', $roleId);
            })
            ->when($request->zone_id, function ($query, $zoneId) {
                $query->where(function($q) use ($zoneId) {
                    $q->where('zone_id', $zoneId)
                      ->orWhereHas('zones', fn($sq) => $sq->where('zones.id', $zoneId));
                });
            })
            ->when($request->area_id, function ($query, $areaId) {
                $query->where(function($q) use ($areaId) {
                    $q->where('area_id', $areaId)
                      ->orWhereHas('areas', fn($sq) => $sq->where('areas.id', $areaId));
                });
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where(function($q) use ($branchId) {
                    $q->where('branch_id', $branchId)
                      ->orWhereHas('branches', fn($sq) => $sq->where('branches.id', $branchId));
                });
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', $request->is_active);
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $roles = Role::select(['id', 'name', 'display_name'])->get();
        $zones = Zone::where('is_active', true)->get(['id', 'name', 'code']);
        $areas = Area::where('is_active', true)->get(['id', 'name', 'code', 'zone_id']);
        $branches = Branch::where('is_active', true)->get(['id', 'name', 'code', 'area_id']);

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'zones' => $zones,
            'areas' => $areas,
            'branches' => $branches,
            'filters' => $request->only(['search', 'role_id', 'zone_id', 'area_id', 'branch_id', 'is_active']),
        ]);
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
        if (!empty($validated['zone_ids'])) {
            $user->zones()->sync($validated['zone_ids']);
        }
        if (!empty($validated['area_ids'])) {
            $user->areas()->sync($validated['area_ids']);
        }
        if (!empty($validated['branch_ids'])) {
            $user->branches()->sync($validated['branch_ids']);
        }

        return redirect()->route('users.index')
            ->with('success', 'User created successfully.');
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20|unique:users,phone,' . $user->id,
            'password' => ['nullable', 'confirmed', Password::defaults()],
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

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update([
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
        ] + (isset($validated['password']) ? ['password' => $validated['password']] : []));

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

        $user->update(['is_active' => !$user->is_active]);

        return back()->with('success', 'User status updated successfully.');
    }

    public function resetPassword(Request $request, User $user)
    {
        $validated = $request->validate([
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back()->with('success', 'Password reset successfully.');
    }

    public function sendCredentials(User $user)
    {
        if (!$user->email) {
            return back()->with('error', 'User does not have an email address.');
        }

        $plainPassword = '12345678';

        try {
            Mail::to($user->email)->send(new \App\Mail\UserCredentialsMail($user, $plainPassword));
            return back()->with('success', 'Login credentials email sent.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Mail failed: ' . $e->getMessage());
        }
    }

    public function sendCredentialsToAll(Request $request)
    {
        $plainPassword = '12345678';

        $query = User::whereNotNull('email')->where('is_active', true);

        $excludeRoleIds = $request->input('exclude_role_ids', []);
        if (!empty($excludeRoleIds)) {
            $query->whereNotIn('role_id', $excludeRoleIds);
        }

        $users = $query->get();
        $sent = 0;
        $lastError = null;

        foreach ($users as $user) {
            try {
                Mail::to($user->email)->send(new \App\Mail\UserCredentialsMail($user, $plainPassword));
                $sent++;
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();
            }
        }

        if ($sent === $users->count()) {
            return back()->with('success', "Login credentials sent to {$sent} user(s).");
        }
        if ($sent > 0) {
            return back()->with('error', "Sent to {$sent}/{$users->count()} users. Last error: " . ($lastError ?? 'unknown'));
        }
        return back()->with('error', 'No mail sent. Error: ' . ($lastError ?? 'Check MAIL_* in .env and /clear'));
    }
}
