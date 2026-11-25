<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_years', function (Blueprint $table) {
            $table->id();
            $table->string('name', 32);
            $table->date('starts_on')->unique();
            $table->date('ends_on');
            $table->foreignId('opened_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('opened_at');
            $table->foreignId('closed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->string('close_reference', 120)->nullable();
            $table->timestamps();
        });

        Schema::create('holidays', function (Blueprint $table) {
            $table->id();
            $table->date('holiday_date');
            $table->string('title', 160);
            $table->string('kind', 24)->default('govt');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['holiday_date', 'branch_id']);
            $table->index('holiday_date');
        });

        Schema::create('branch_financial_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('financial_year_id')->constrained('financial_years')->restrictOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->date('initial_date');
            $table->foreignId('enrolled_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('enrolled_at');
            $table->timestamps();

            $table->unique(['financial_year_id', 'branch_id']);
        });

        Schema::create('branch_accounting_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_financial_year_id')->constrained('branch_financial_years')->restrictOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->string('kind', 10);
            $table->date('period_date');
            $table->string('status', 16)->default('open');
            $table->foreignId('opened_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('opened_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->string('close_reference', 120)->nullable();
            $table->json('summary')->nullable();
            $table->timestamps();

            $table->unique(['branch_id', 'kind', 'period_date'], 'branch_accounting_period_unique');
            $table->index(['branch_id', 'kind', 'status']);
        });

        Schema::create('branch_month_processes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('branch_financial_year_id')->constrained('branch_financial_years')->restrictOnDelete();
            $table->date('month_date');
            $table->string('status', 16)->default('processed');
            $table->timestamp('llp_processed_at')->nullable();
            $table->foreignId('llp_processed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->json('llp_summary')->nullable();
            $table->foreignId('processed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('processed_at');
            $table->foreignId('closed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->json('summary')->nullable();
            $table->timestamps();

            $table->unique(['branch_id', 'month_date']);
        });

        Schema::create('period_reopen_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->string('kind', 10);
            $table->date('period_date');
            $table->string('reason', 500);
            $table->foreignId('reopened_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('reopened_at');
            $table->timestamps();

            $table->index(['branch_id', 'kind', 'period_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('period_reopen_logs');
        Schema::dropIfExists('branch_month_processes');
        Schema::dropIfExists('branch_accounting_periods');
        Schema::dropIfExists('branch_financial_years');
        Schema::dropIfExists('holidays');
        Schema::dropIfExists('financial_years');
    }
};
