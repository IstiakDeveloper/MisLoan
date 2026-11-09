<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_accounts', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('loan_application_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('principal_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('charge_income_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->json('terms_snapshot');
            $table->char('opening_hash', 64);
            $table->string('opening_reference', 255);
            $table->string('opening_mode', 24);
            $table->date('opened_on');
            $table->date('disbursed_on');
            $table->bigInteger('contract_principal_paisa');
            $table->bigInteger('contract_charge_paisa');
            $table->bigInteger('opening_principal_paisa');
            $table->bigInteger('opening_charge_paisa');
            $table->bigInteger('pre_opening_paid_paisa');
            $table->string('allocation_policy', 24)->default('manual_split');
            $table->string('status', 16)->default('active');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['branch_id', 'status']);
        });
        Schema::create('loan_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_account_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('sequence');
            $table->date('due_on');
            $table->bigInteger('due_paisa');
            $table->unique(['loan_account_id', 'sequence']);
            $table->index(['loan_account_id', 'due_on']);
        });
        Schema::create('loan_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('loan_account_id')->constrained()->restrictOnDelete();
            $table->string('idempotency_key', 100);
            $table->char('payload_hash', 64);
            $table->string('kind', 24);
            $table->bigInteger('principal_paisa'); // signed receivable movement
            $table->bigInteger('charge_paisa'); // signed contractual charge movement
            $table->foreignId('counter_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('journal_entry_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->foreignId('reversal_of')->nullable()->unique()->constrained('loan_transactions')->restrictOnDelete();
            $table->date('business_date');
            $table->string('description', 1000);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at');
            $table->unique(['loan_account_id', 'idempotency_key'], 'loan_tx_request_unique');
            $table->index(['loan_account_id', 'business_date']);
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('loan_transactions');
        Schema::dropIfExists('loan_installments');
        Schema::dropIfExists('loan_accounts');
    }
};
