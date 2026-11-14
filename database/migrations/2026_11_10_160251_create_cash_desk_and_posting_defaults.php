<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gl_posting_defaults', function (Blueprint $table) {
            $table->id();
            $table->string('scope_key', 80)->unique();
            $table->foreignId('branch_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('loan_product_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('savings_product_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('loan_principal_account_id')->nullable()->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('loan_charge_income_account_id')->nullable()->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('loan_cash_account_id')->nullable()->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('savings_liability_account_id')->nullable()->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('savings_cash_account_id')->nullable()->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('cashier_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('cash_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->date('business_date');
            $table->bigInteger('opening_count_paisa');
            $table->bigInteger('counted_close_paisa')->nullable();
            $table->bigInteger('gl_balance_paisa')->nullable();
            $table->bigInteger('variance_paisa')->nullable();
            $table->string('variance_note', 1000)->nullable();
            $table->string('status', 16);
            $table->foreignId('opened_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('review_note', 1000)->nullable();
            $table->foreignId('handed_over_to')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('open_key', 100);
            $table->char('open_hash', 64);
            $table->timestamps();
            $table->unique('open_key');
            $table->index(['branch_id', 'business_date', 'status']);
        });

        Schema::create('bank_statement_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('bank_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->date('business_date');
            $table->bigInteger('amount_paisa');
            $table->string('reference', 255);
            $table->string('description', 1000);
            $table->foreignId('matched_journal_line_id')->nullable()->unique()->constrained('journal_lines')->restrictOnDelete();
            $table->foreignId('matched_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('matched_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['branch_id', 'bank_account_id', 'business_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_statement_lines');
        Schema::dropIfExists('cashier_sessions');
        Schema::dropIfExists('gl_posting_defaults');
    }
};
