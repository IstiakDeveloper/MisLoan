<?php

namespace App\Support;

use App\Models\Role;

class RoleCatalog
{
    /**
     * Canonical system roles. Used by RoleSeeder and the Roles page Sync button.
     *
     * @return list<array{name: string, display_name: string, description: string, permissions: list<string>}>
     */
    public static function definitions(): array
    {
        return [
            [
                'name' => 'super_admin',
                'display_name' => 'Super Admin',
                'description' => 'Super administrator with full access',
                'permissions' => [
                    'manage_users',
                    'manage_roles',
                    'manage_branches',
                    'manage_areas',
                    'manage_zones',
                    'approve_loans',
                    'approve_members',
                    'view_all_reports',
                    'generate_reports',
                    'system_settings',
                ],
            ],
            [
                'name' => 'head_office',
                'display_name' => 'Head Office',
                'description' => 'Head office staff',
                'permissions' => [
                    'view_all_applications',
                    'approve_loans',
                    'approve_members',
                    'reject_applications',
                    'request_corrections',
                    'view_all_reports',
                    'generate_reports',
                    'manage_rejection_reasons',
                ],
            ],
            [
                'name' => 'zone_manager',
                'display_name' => 'Zone Manager',
                'description' => 'Zone manager',
                'permissions' => [
                    'view_zone_applications',
                    'view_zone_branches',
                    'view_zone_reports',
                    'receive_notifications',
                ],
            ],
            [
                'name' => 'area_manager',
                'display_name' => 'Area Manager',
                'description' => 'Area manager',
                'permissions' => [
                    'view_area_applications',
                    'view_area_branches',
                    'view_area_reports',
                    'receive_notifications',
                ],
            ],
            [
                'name' => 'branch_manager',
                'display_name' => 'Branch Manager',
                'description' => 'Branch manager',
                'permissions' => [
                    'submit_loan_applications',
                    'submit_member_admissions',
                    'view_branch_applications',
                    'resubmit_corrections',
                    'view_branch_reports',
                    'receive_notifications',
                    'manage_branch_users',
                ],
            ],
            [
                'name' => 'branch_user',
                'display_name' => 'Branch User',
                'description' => 'Branch user',
                'permissions' => [
                    'submit_loan_applications',
                    'submit_member_admissions',
                    'view_branch_applications',
                    'receive_notifications',
                    'edit_loan_forms',
                    'edit_admission_forms',
                ],
            ],
            [
                'name' => 'field_officer',
                'display_name' => 'Field Officer',
                'description' => 'Field Officer (survey / form fill for own branch)',
                'permissions' => [
                    'submit_loan_applications',
                    'submit_member_admissions',
                    'view_branch_applications',
                    'receive_notifications',
                ],
            ],
            [
                'name' => 'admf',
                'display_name' => 'Assistant Director Microfinance (ADMF)',
                'description' => 'Assistant Director Microfinance - can approve/reject when selected by branch',
                'permissions' => [
                    'vittik_approve',
                    'view_vittik_requests',
                    'receive_notifications',
                ],
            ],
            [
                'name' => 'dmf',
                'display_name' => 'Director Microfinance (DMF)',
                'description' => 'Director Microfinance - can approve/reject when selected by branch',
                'permissions' => [
                    'vittik_approve',
                    'view_vittik_requests',
                    'receive_notifications',
                ],
            ],
            [
                'name' => 'ed',
                'display_name' => 'Executive Director (ED)',
                'description' => 'Executive Director - approver rights plus SuperAdmin-like view access (no edit)',
                'permissions' => [
                    'vittik_approve',
                    'view_vittik_requests',
                    'receive_notifications',
                    'view_all_applications',
                    'view_all_reports',
                    'generate_reports',
                ],
            ],
        ];
    }

    /**
     * Safe sync for production:
     * - creates missing system roles
     * - adds missing catalog permissions (never removes existing ones)
     * - never overwrites display_name / description if already set
     * - never touches custom roles that are not in the catalog
     *
     * @return array{created: list<string>, permissions_added: array<string, list<string>>, unchanged: list<string>}
     */
    public static function sync(): array
    {
        $created = [];
        $permissionsAdded = [];
        $unchanged = [];

        foreach (self::definitions() as $definition) {
            $role = Role::query()->where('name', $definition['name'])->first();

            if (! $role) {
                Role::create($definition);
                $created[] = $definition['name'];

                continue;
            }

            $plan = self::planExistingRoleUpdate(
                $definition,
                $role->permissions ?? [],
                (string) $role->display_name,
                $role->description
            );

            if ($plan['missing_permissions'] !== []) {
                $permissionsAdded[$definition['name']] = $plan['missing_permissions'];
            }

            if ($plan['updates'] === []) {
                $unchanged[] = $definition['name'];

                continue;
            }

            $role->update($plan['updates']);
        }

        return [
            'created' => $created,
            'permissions_added' => $permissionsAdded,
            'unchanged' => $unchanged,
        ];
    }

    /**
     * Compute a safe update for an existing role. Never removes permissions
     * or overwrites a non-empty display name / description.
     *
     * @param  array{name: string, display_name: string, description: string, permissions: list<string>}  $definition
     * @param  list<mixed>|null  $existingPermissions
     * @return array{updates: array<string, mixed>, missing_permissions: list<string>}
     */
    public static function planExistingRoleUpdate(
        array $definition,
        ?array $existingPermissions,
        string $displayName,
        ?string $description
    ): array {
        $existing = array_values(array_filter(
            $existingPermissions ?? [],
            fn ($permission) => is_string($permission) && $permission !== ''
        ));
        $missingPermissions = array_values(array_diff($definition['permissions'], $existing));

        $updates = [];
        if ($missingPermissions !== []) {
            $updates['permissions'] = array_values(array_unique(array_merge($existing, $missingPermissions)));
        }

        if (trim($displayName) === '') {
            $updates['display_name'] = $definition['display_name'];
        }

        if (trim((string) $description) === '') {
            $updates['description'] = $definition['description'];
        }

        return [
            'updates' => $updates,
            'missing_permissions' => $missingPermissions,
        ];
    }

    public static function summaryMessage(array $result): string
    {
        $created = $result['created'] ?? [];
        $permissionsAdded = $result['permissions_added'] ?? [];

        if ($created === [] && $permissionsAdded === []) {
            return 'সব রোল ইতিমধ্যে আপ টু ডেট। কোনো পরিবর্তন হয়নি।';
        }

        $parts = ['সিঙ্ক সম্পন্ন।'];

        if ($created !== []) {
            $parts[] = 'নতুন রোল: '.implode(', ', $created).'.';
        }

        if ($permissionsAdded !== []) {
            $permissionParts = [];
            foreach ($permissionsAdded as $roleName => $permissions) {
                $permissionParts[] = $roleName.' (+'.implode(', ', $permissions).')';
            }
            $parts[] = 'নতুন পারমিশন: '.implode('; ', $permissionParts).'.';
        }

        $parts[] = 'আগের নাম, বিবরণ ও কাস্টম পারমিশন অপরিবর্তিত রাখা হয়েছে।';

        return implode(' ', $parts);
    }
}
