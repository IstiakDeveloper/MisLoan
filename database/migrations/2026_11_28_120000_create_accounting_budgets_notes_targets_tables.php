<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('account_budgets')) {
            Schema::create('account_budgets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
                $table->foreignId('financial_year_id')->nullable()->constrained('financial_years')->nullOnDelete();
                $table->foreignId('ledger_account_id')->constrained('ledger_accounts')->restrictOnDelete();
                $table->string('period_month', 16); // e.g. '2026-11' or 'annual'
                $table->bigInteger('budget_paisa')->default(0);
                $table->string('note', 500)->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['branch_id', 'ledger_account_id', 'period_month'], 'account_budget_unique');
                $table->index(['branch_id', 'period_month']);
            });
        }

        if (! Schema::hasTable('account_notes')) {
            Schema::create('account_notes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
                $table->foreignId('ledger_account_id')->nullable()->constrained('ledger_accounts')->nullOnDelete();
                $table->string('note_no', 32)->nullable();
                $table->string('title', 200);
                $table->date('note_date');
                $table->text('content');
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['branch_id', 'note_date']);
            });
        }

        if (! Schema::hasTable('branch_targets')) {
            Schema::create('branch_targets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
                $table->string('period_month', 7); // YYYY-MM
                $table->string('target_key', 48); // member_admission, loan_disbursement, loan_collection, savings_collection
                $table->bigInteger('target_value')->default(0); // count or paisa depending on key
                $table->string('note', 500)->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['branch_id', 'period_month', 'target_key'], 'branch_target_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_targets');
        Schema::dropIfExists('account_notes');
        Schema::dropIfExists('account_budgets');
    }
};
