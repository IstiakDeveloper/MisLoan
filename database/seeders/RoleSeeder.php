<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
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
                ],
            ],
            [
                'name' => 'field_officer',
                'display_name' => 'Field Officer',
                'description' => 'Field Officer (survey / form fill for own branch)',
                'permissions' => [
                    // Shurute same basic submission rights; pore jodi chai draft-only/limited kora jabe
                    'submit_loan_applications',
                    'submit_member_admissions',
                    'view_branch_applications',
                    'receive_notifications',
                ],
            ],
            // Team Vittik Onumodon (Financial Approval) - branch selects these for approval
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

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['name' => $role['name']],
                $role
            );
        }

        $this->command->info('Roles seeded successfully!');
    }
}
