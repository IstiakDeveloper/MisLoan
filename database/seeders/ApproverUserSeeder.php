<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ApproverUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates default Team Vittik approver users:
     * - ADMF
     * - DMF
     * - ED
     *
     * These users have has_all_access = true so they are selectable
     * from any branch for Team Vittik Onumodon.
     */
    public function run(): void
    {
        // Ensure approver roles exist
        $roles = Role::whereIn('name', Role::approverRoleNames())
            ->get()
            ->keyBy('name');

        $users = [
            'admf' => [
                'name' => 'Assistant Director Microfinance',
                'email' => 'admf@misloan.com',
                'username' => 'admf',
                'phone' => '01710000001',
            ],
            'dmf' => [
                'name' => 'Director Microfinance',
                'email' => 'dmf@misloan.com',
                'username' => 'dmf',
                'phone' => '01710000002',
            ],
            'ed' => [
                'name' => 'Executive Director',
                'email' => 'ed@misloan.com',
                'username' => 'ed',
                'phone' => '01710000003',
            ],
        ];

        foreach ($users as $roleName => $data) {
            $role = $roles->get($roleName);

            if (! $role) {
                if (isset($this->command)) {
                    $this->command->warn("Role '{$roleName}' not found. Skipping approver user seeding for this role.");
                }
                continue;
            }

            // Skip if user already exists (by email or username)
            $existing = User::where('email', $data['email'])
                ->orWhere('username', $data['username'])
                ->first();

            if ($existing) {
                if (isset($this->command)) {
                    $this->command->info("Approver user '{$data['username']}' already exists. Skipping.");
                }
                continue;
            }

            User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'],
                'username' => $data['username'],
                'password' => Hash::make('12345678'),
                'role_id' => $role->id,
                'branch_id' => null,
                'area_id' => null,
                'zone_id' => null,
                'has_all_access' => true,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            if (isset($this->command)) {
                $this->command->info("Approver user '{$data['username']}' created successfully.");
            }
        }
    }
}

