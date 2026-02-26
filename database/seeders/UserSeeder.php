<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Branch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Branch User Seeder: প্রতিটি শাখার জন্য branch code দিয়ে Branch User role এ এক জন ইউজার।
 * Branch Manager পরে আলাদা সিডার বা এডমিন থেকে যোগ করুন।
 *
 * ডাটাবেজে থাকা পুরনো ইউজার আপডেট করতে (আগে Branch Manager ছিল যারা):
 *   php artisan db:seed --class=UserSeeder
 *
 * টিঙ্কার দিয়ে একই কাজ:
 *   php artisan tinker
 *   >>> (new \Database\Seeders\UserSeeder)->run();
 */
class UserSeeder extends Seeder
{
    /**
     * Branch users: প্রতিটি শাখার জন্য Branch User role দিয়ে এক জন ইউজার (branch code দিয়ে).
     * Branch Manager পরে আলাদাভাবে create করা যাবে।
     */
    public function run(): void
    {
        $branchUserRole = Role::where('name', 'branch_user')->first();
        if (!$branchUserRole) {
            $this->command->warn('branch_user role not found. Run RoleSeeder first.');
            return;
        }

        $branches = Branch::orderBy('code')->get();

        foreach ($branches as $branch) {
            $email = $branch->code . '@misloan.com';
            $name = preg_replace('/\s*Branch\s*$/i', '', $branch->name) . ' User';

            User::updateOrCreate(
                ['email' => $email],
                [
                    'name'       => $name,
                    'username'  => $branch->code,
                    'role_id'   => $branchUserRole->id,
                    'branch_id' => $branch->id,
                    'password'  => Hash::make('password'),
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('Branch users seeded: ' . $branches->count() . ' (Branch User role). Branch Manager পরে আলাদা করে যোগ করুন।');
    }
}
