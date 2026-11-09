<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->string('source_type', 32)->default('manual');
        });
        Schema::create('savings_accounts', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('savings_application_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->foreignId('liability_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->json('product_snapshot');
            $table->char('opening_hash', 64);
            $table->string('opening_reference', 255);
            $table->date('opened_on');
            $table->string('status', 16)->default('active');
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->index(['branch_id', 'status']);
        });
        Schema::create('savings_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('savings_account_id')->constrained()->restrictOnDelete();
            $table->string('idempotency_key', 100);
            $table->char('payload_hash', 64);
            $table->string('kind', 16);
            $table->bigInteger('amount_paisa'); // signed: positive increases the member's savings
            $table->foreignId('counter_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('journal_entry_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('reversal_of')->nullable()->unique()->constrained('savings_transactions')->restrictOnDelete();
            $table->date('business_date');
            $table->string('description', 1000);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at');
            $table->unique(['savings_account_id', 'idempotency_key'], 'savings_tx_request_unique');
            $table->index(['savings_account_id', 'business_date']);
        });
        Schema::create('savings_holds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('savings_account_id')->constrained()->restrictOnDelete();
            $table->string('request_key', 100);
            $table->bigInteger('amount_paisa');
            $table->string('reason', 255);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at');
            $table->timestamp('released_at')->nullable();
            $table->foreignId('released_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->unique(['savings_account_id', 'request_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('savings_holds');
        Schema::dropIfExists('savings_transactions');
        Schema::dropIfExists('savings_accounts');
        Schema::table('journal_entries', fn (Blueprint $table) => $table->dropColumn('source_type'));
    }
};
