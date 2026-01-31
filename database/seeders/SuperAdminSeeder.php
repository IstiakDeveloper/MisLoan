<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get the super_admin role
        $superAdminRole = Role::where('name', 'super_admin')->first();

        if (!$superAdminRole) {
            $this->command->error('Super Admin role not found. Please run RoleSeeder first.');
            return;
        }

        // Check if super admin already exists
        $existingSuperAdmin = User::where('email', 'admin@misloan.com')->first();

        if ($existingSuperAdmin) {
            $this->command->info('Super Admin already exists.');
            return;
        }

        // Create Super Admin user
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@misloan.com',
            'phone' => '01700000000',
            'username' => 'superadmin',
            'password' => Hash::make('password'), // Change this in production
            'role_id' => $superAdminRole->id,
            'branch_id' => null,
            'area_id' => null,
            'zone_id' => null,
            'has_all_access' => true,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $this->command->info('Super Admin created successfully!');
        $this->command->info('Email: admin@misloan.com');
        $this->command->info('Password: password');
        $this->command->warn('IMPORTANT: Please change the password after first login!');
    }
}
