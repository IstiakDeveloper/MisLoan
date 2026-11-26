<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('branches')) {
            return;
        }

        // Deactivate any "Unknown" pseudo-branch so it never appears in reports or dropdowns
        $unknownUpdate = ['is_active' => false];
        if (Schema::hasColumn('branches', 'accounting_enabled')) {
            $unknownUpdate['accounting_enabled'] = false;
        }

        DB::table('branches')
            ->where(function ($q) {
                $q->where('code', '1000')
                    ->orWhereRaw('LOWER(name) = ?', ['unknown']);
            })
            ->update($unknownUpdate);

        // Head Office is not an operational field branch; ensure pilot accounting stays off
        if (Schema::hasColumn('branches', 'accounting_enabled')) {
            DB::table('branches')
                ->where(function ($q) {
                    $q->where('code', '0000')
                        ->orWhereRaw('LOWER(name) = ?', ['head office']);
                })
                ->update(['accounting_enabled' => false]);
        }

        Cache::forget('global_org_filter_options');
    }

    public function down(): void
    {
        // Intentional one-way data hygiene cleanup
    }
};
