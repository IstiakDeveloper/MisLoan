<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            SuperAdminSeeder::class,
            ZoneSeeder::class,
            AreaSeeder::class,
            BranchSeeder::class,
            UserSeeder::class,
            MemberCategorySeeder::class,
            LoanCategorySeeder::class,
            SavingsProductAutomationSeeder::class,
            SavingsProductSeeder::class,

        ]);

        $this->command->info('Database seeding completed!');
        $this->command->info('✓ Roles and Super Admin created');
        $this->command->info('✓ 3 Zones created');
        $this->command->info('✓ 9 Areas created');
        $this->command->info('✓ 42 Branches created');
        $this->command->info('✓ 43 Users created');
        $this->command->info('✓ 7 Member Categories created');
    }
}
