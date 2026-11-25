<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('journal_entries', 'accounting_period_id') && DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE `journal_entries` MODIFY `accounting_period_id` BIGINT UNSIGNED NULL');
        }
    }

    public function down(): void
    {
        // Keep nullable for compatibility with branch_accounting_periods.
    }
};
