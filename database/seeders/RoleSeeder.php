<?php

namespace Database\Seeders;

use App\Support\RoleCatalog;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Safe in production: only creates missing roles and adds missing permissions.
     * Existing display names, descriptions, and custom permissions are kept.
     */
    public function run(): void
    {
        $result = RoleCatalog::sync();

        $this->command->info(RoleCatalog::summaryMessage($result));
    }
}
