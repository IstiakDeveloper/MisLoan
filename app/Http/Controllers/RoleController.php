<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoleController extends Controller
{
    // Define all available permissions
    private function getAllPermissions()
    {
        return [
            'zones' => [
                'zones.view' => 'View Zones',
                'zones.create' => 'Create Zone',
                'zones.edit' => 'Edit Zone',
                'zones.delete' => 'Delete Zone',
            ],
            'areas' => [
                'areas.view' => 'View Areas',
                'areas.create' => 'Create Area',
                'areas.edit' => 'Edit Area',
                'areas.delete' => 'Delete Area',
            ],
            'branches' => [
                'branches.view' => 'View Branches',
                'branches.create' => 'Create Branch',
                'branches.edit' => 'Edit Branch',
                'branches.delete' => 'Delete Branch',
            ],
            'users' => [
                'users.view' => 'View Users',
                'users.create' => 'Create User',
                'users.edit' => 'Edit User',
                'users.delete' => 'Delete User',
            ],
            'roles' => [
                'roles.view' => 'View Roles',
                'roles.create' => 'Create Role',
                'roles.edit' => 'Edit Role',
                'roles.delete' => 'Delete Role',
            ],
            'loan_applications' => [
                'loan_applications.view' => 'View Loan Applications',
                'loan_applications.create' => 'Submit Loan Application',
                'loan_applications.edit' => 'Edit Loan Application',
                'loan_applications.review' => 'Review Loan Application',
                'loan_applications.approve' => 'Approve Loan Application',
                'loan_applications.reject' => 'Reject Loan Application',
                'loan_applications.delete' => 'Delete Loan Application',
            ],
            'member_admissions' => [
                'member_admissions.view' => 'View Member Admissions',
                'member_admissions.create' => 'Submit Member Admission',
                'member_admissions.edit' => 'Edit Member Admission',
                'member_admissions.review' => 'Review Member Admission',
                'member_admissions.approve' => 'Approve Member Admission',
                'member_admissions.reject' => 'Reject Member Admission',
                'member_admissions.delete' => 'Delete Member Admission',
            ],
            'reports' => [
                'reports.view' => 'View Reports',
                'reports.generate' => 'Generate Reports',
                'reports.export' => 'Export Reports',
            ],
            'settings' => [
                'settings.view' => 'View Settings',
                'settings.edit' => 'Edit Settings',
            ],
        ];
    }

    public function index(Request $request)
    {
        $roles = Role::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('display_name', 'like', "%{$search}%");
            })
            ->withCount('users')
            ->latest()
            ->get();

        return Inertia::render('Roles/Index', [
            'roles' => $roles,
            'permissions' => $this->getAllPermissions(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $role = Role::create($validated);

        return redirect()->route('roles.index')
            ->with('success', 'Role created successfully.');
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name,' . $role->id,
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',
        ]);

        $role->update($validated);

        return redirect()->route('roles.index')
            ->with('success', 'Role updated successfully.');
    }

    public function destroy(Role $role)
    {
        if ($role->users()->count() > 0) {
            return back()->with('error', 'Cannot delete role with assigned users.');
        }

        $role->delete();

        return redirect()->route('roles.index')
            ->with('success', 'Role deleted successfully.');
    }

    public function getAll()
    {
        $roles = Role::select(['id', 'name', 'display_name'])->get();
        return response()->json($roles);
    }
}
