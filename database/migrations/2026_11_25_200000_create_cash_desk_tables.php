<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cashier_sessions')) {
            Schema::create('cashier_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->date('business_date');
                $table->foreignId('opened_by')->constrained('users')->restrictOnDelete();
                $table->timestamp('opened_at');
                $table->bigInteger('opening_cash_paisa')->default(0);
                $table->bigInteger('expected_closing_paisa')->nullable();
                $table->bigInteger('actual_closing_paisa')->nullable();
                $table->bigInteger('variance_paisa')->nullable();
                $table->string('status', 20)->default('open'); // open, submitted, approved, rejected
                $table->timestamp('submitted_at')->nullable();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->string('note', 500)->nullable();
                $table->timestamps();

                $table->unique(['branch_id', 'business_date']);
                $table->index(['branch_id', 'status']);
            });
        }

        if (! Schema::hasTable('bank_statement_lines')) {
            Schema::create('bank_statement_lines', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->foreignId('ledger_account_id')->constrained('ledger_accounts')->restrictOnDelete();
                $table->date('statement_date');
                $table->string('reference_no', 100)->nullable();
                $table->string('description', 500);
                $table->bigInteger('debit_paisa')->default(0);
                $table->bigInteger('credit_paisa')->default(0);
                $table->foreignId('matched_journal_entry_id')->nullable()->constrained('journal_entries')->nullOnDelete();
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();

                $table->index(['branch_id', 'statement_date']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_statement_lines');
        Schema::dropIfExists('cashier_sessions');
    }
};
