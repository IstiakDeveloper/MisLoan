<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('cmo_daily_allocations') && ! Schema::hasTable('cso_daily_allocations')) {
            Schema::rename('cmo_daily_allocations', 'cso_daily_allocations');
        } elseif (! Schema::hasTable('cso_daily_allocations')) {
            Schema::create('cso_daily_allocations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('area_id')->constrained('areas')->cascadeOnDelete();
                $table->date('duty_date');
                $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('notes', 255)->nullable();
                $table->timestamps();

                $table->unique(['area_id', 'duty_date'], 'cso_alloc_area_date_unique');
                $table->index(['user_id', 'duty_date'], 'cso_alloc_user_date_index');
            });
        }

        DB::table('roles')->where('name', 'cmo')->update([
            'name' => 'cso',
            'display_name' => 'Customer Service Officer (CSO)',
            'description' => 'Customer Service Officer - verifies and monitors loan & admission applications for daily assigned areas',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('cso_daily_allocations')) {
            Schema::rename('cso_daily_allocations', 'cmo_daily_allocations');
        }

        DB::table('roles')->where('name', 'cso')->update([
            'name' => 'cmo',
            'display_name' => 'Credit Monitoring Officer (CMO)',
            'description' => 'Credit Monitoring Officer - verifies and monitors loan & admission applications for daily assigned areas',
        ]);
    }
};
