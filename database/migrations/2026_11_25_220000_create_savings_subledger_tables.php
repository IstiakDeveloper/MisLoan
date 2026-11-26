<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('savings_accounts')) {
            Schema::create('savings_accounts', function (Blueprint $table) {
                $table->id();
                $table->string('account_no', 40)->unique();
                $table->foreignId('savings_application_id')->nullable()->constrained('savings_applications')->nullOnDelete();
                $table->foreignId('member_admission_id')->constrained('member_admissions')->restrictOnDelete();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->foreignId('samity_id')->nullable()->constrained('samities')->nullOnDelete();
                $table->foreignId('savings_product_id')->constrained('savings_products')->restrictOnDelete();
                $table->decimal('profit_rate', 8, 4)->default(0);
                $table->bigInteger('balance_paisa')->default(0);
                $table->bigInteger('held_paisa')->default(0);
                $table->date('opened_date');
                $table->string('status', 20)->default('active'); // active, closed
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();

                $table->index(['branch_id', 'status']);
            });
        }

        if (! Schema::hasTable('savings_transactions')) {
            Schema::create('savings_transactions', function (Blueprint $table) {
                $table->id();
                $table->uuid('reference')->unique();
                $table->foreignId('savings_account_id')->constrained('savings_accounts')->restrictOnDelete();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->string('kind', 20); // deposit, withdrawal, profit, reversal
                $table->date('business_date');
                $table->bigInteger('amount_paisa');
                $table->string('payment_mode', 16)->default('cash');
                $table->string('idempotency_key', 100);
                $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->restrictOnDelete();
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->string('note', 500)->nullable();
                $table->timestamp('created_at');

                $table->unique(['branch_id', 'idempotency_key']);
                $table->index(['savings_account_id', 'business_date']);
            });
        }

        if (! Schema::hasTable('savings_holds')) {
            Schema::create('savings_holds', function (Blueprint $table) {
                $table->id();
                $table->foreignId('savings_account_id')->constrained('savings_accounts')->cascadeOnDelete();
                $table->bigInteger('amount_paisa');
                $table->string('reason', 300);
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('savings_holds');
        Schema::dropIfExists('savings_transactions');
        Schema::dropIfExists('savings_accounts');
    }
};
