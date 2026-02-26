<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BranchManagerSeeder extends Seeder
{
    private const PASSWORD = '12345678';

    /**
     * Run the database seeds.
     * Creates one Branch Manager user per branch.
     * Username: bm + slug (e.g. Branch "Naogaon" → bmnaogaon)
     * Email: bmnaogaon@misloan.com
     */
    public function run(): void
    {
        $branchManagerRole = Role::where('name', Role::BRANCH_MANAGER)->first();

        if (! $branchManagerRole) {
            $this->command?->warn('Branch manager role not found. Run RoleSeeder first.');
            return;
        }

        foreach (Branch::all() as $branch) {
            $exists = User::where('role_id', $branchManagerRole->id)
                ->where('branch_id', $branch->id)
                ->exists();

            if (! $exists) {
                $slug = $this->nameToSlug($branch->name);
                $username = 'bm' . $slug;
                $email = $username . '@misloan.com';

                User::create([
                    'name' => $branch->name . ' Branch Manager',
                    'email' => $email,
                    'phone' => null,
                    'username' => $username,
                    'password' => Hash::make(self::PASSWORD),
                    'role_id' => $branchManagerRole->id,
                    'branch_id' => $branch->id,
                    'has_all_access' => false,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);

                $this->command?->info("Branch Manager created for {$branch->name} ({$username}).");
            }
        }
    }

    /**
     * Convert name to slug: lowercase, remove spaces. (Branch names in DB have no " Branch" suffix.)
     */
    private function nameToSlug(string $name): string
    {
        return strtolower(preg_replace('/\s+/', '', $name));
    }
}
