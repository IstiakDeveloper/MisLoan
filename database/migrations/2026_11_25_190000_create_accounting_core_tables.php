<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ledger_accounts')) {
            Schema::create('ledger_accounts', function (Blueprint $table) {
                $table->id();
                $table->string('code', 32)->unique();
                $table->string('name');
                $table->string('type', 16); // asset, liability, equity, income, expense
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['type', 'is_active']);
            });
        }

        if (! Schema::hasTable('gl_posting_defaults')) {
            Schema::create('gl_posting_defaults', function (Blueprint $table) {
                $table->id();
                $table->string('scope', 24)->default('global'); // global, loan_product, savings_product
                $table->unsignedBigInteger('product_id')->nullable();
                $table->string('event_key', 64);
                $table->foreignId('ledger_account_id')->constrained('ledger_accounts')->restrictOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['scope', 'product_id', 'event_key'], 'gl_posting_default_unique');
            });
        }

        if (! Schema::hasTable('journal_entries')) {
            Schema::create('journal_entries', function (Blueprint $table) {
                $table->id();
                $table->uuid('reference')->unique();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->foreignId('branch_accounting_period_id')->nullable()->constrained('branch_accounting_periods')->restrictOnDelete();
                $table->string('idempotency_key', 100);
                $table->char('payload_hash', 64);
                $table->date('business_date');
                $table->string('description', 1000);
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->foreignId('reversal_of')->nullable()->unique()->constrained('journal_entries')->restrictOnDelete();
                $table->timestamp('created_at');

                $table->unique(['branch_id', 'idempotency_key']);
                $table->index(['branch_id', 'business_date']);
            });
        } elseif (! Schema::hasColumn('journal_entries', 'branch_accounting_period_id')) {
            Schema::table('journal_entries', function (Blueprint $table) {
                $table->foreignId('branch_accounting_period_id')
                    ->nullable()
                    ->after('branch_id')
                    ->constrained('branch_accounting_periods')
                    ->restrictOnDelete();
            });
        }

        if (! Schema::hasTable('journal_lines')) {
            Schema::create('journal_lines', function (Blueprint $table) {
                $table->id();
                $table->foreignId('journal_entry_id')->constrained('journal_entries')->restrictOnDelete();
                $table->foreignId('ledger_account_id')->constrained('ledger_accounts')->restrictOnDelete();
                $table->bigInteger('debit_paisa')->default(0);
                $table->bigInteger('credit_paisa')->default(0);

                $table->index(['ledger_account_id', 'journal_entry_id']);
            });
        }

        if (! Schema::hasTable('accounting_vouchers')) {
            Schema::create('accounting_vouchers', function (Blueprint $table) {
                $table->id();
                $table->uuid('reference')->unique();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->string('kind', 16); // payment, receipt, journal, contra, reversal
                $table->foreignId('reversal_of')->nullable()->constrained('journal_entries')->restrictOnDelete();
                $table->date('business_date');
                $table->string('description', 1000);
                $table->json('lines');
                $table->string('idempotency_key', 100);
                $table->char('payload_hash', 64);
                $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
                $table->string('status', 16)->default('pending'); // pending, approved, rejected
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->string('decision_note', 1000)->nullable();
                $table->foreignId('journal_entry_id')->nullable()->unique()->constrained('journal_entries')->restrictOnDelete();
                $table->timestamp('created_at');

                $table->unique(['branch_id', 'idempotency_key']);
                $table->index(['branch_id', 'status']);
                $table->index(['reversal_of', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_vouchers');
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('gl_posting_defaults');
        Schema::dropIfExists('ledger_accounts');
    }
};
