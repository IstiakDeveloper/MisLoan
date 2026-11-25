<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('loan_accounts')) {
            Schema::create('loan_accounts', function (Blueprint $table) {
                $table->id();
                $table->string('account_no', 40)->unique();
                $table->foreignId('loan_application_id')->nullable()->constrained('loan_applications')->nullOnDelete();
                $table->foreignId('member_admission_id')->constrained('member_admissions')->restrictOnDelete();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->foreignId('samity_id')->nullable()->constrained('samities')->nullOnDelete();
                $table->foreignId('loan_product_id')->constrained('loan_products')->restrictOnDelete();
                $table->string('pricing_method', 20)->default('flat'); // flat, declining
                $table->string('installment_frequency', 20)->default('weekly'); // weekly, monthly
                $table->decimal('annual_rate', 8, 4)->default(0);
                $table->unsignedInteger('installment_count');
                $table->bigInteger('principal_paisa');
                $table->bigInteger('service_charge_paisa');
                $table->bigInteger('principal_paid_paisa')->default(0);
                $table->bigInteger('service_charge_paid_paisa')->default(0);
                $table->date('disbursed_date');
                $table->date('first_due_date');
                $table->string('status', 20)->default('active'); // active, repaid, written_off
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->timestamps();

                $table->index(['branch_id', 'status']);
                $table->index(['samity_id', 'status']);
            });
        }

        if (! Schema::hasTable('loan_installments')) {
            Schema::create('loan_installments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('loan_account_id')->constrained('loan_accounts')->cascadeOnDelete();
                $table->unsignedInteger('installment_no');
                $table->date('due_date');
                $table->bigInteger('principal_due_paisa');
                $table->bigInteger('service_charge_due_paisa');
                $table->bigInteger('principal_paid_paisa')->default(0);
                $table->bigInteger('service_charge_paid_paisa')->default(0);
                $table->string('status', 20)->default('pending'); // pending, partial, paid
                $table->timestamps();

                $table->unique(['loan_account_id', 'installment_no']);
                $table->index(['due_date', 'status']);
            });
        }

        if (! Schema::hasTable('loan_transactions')) {
            Schema::create('loan_transactions', function (Blueprint $table) {
                $table->id();
                $table->uuid('reference')->unique();
                $table->foreignId('loan_account_id')->constrained('loan_accounts')->restrictOnDelete();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->string('kind', 20); // disbursement, collection, rebate, reversal
                $table->date('business_date');
                $table->bigInteger('principal_paisa')->default(0);
                $table->bigInteger('service_charge_paisa')->default(0);
                $table->bigInteger('total_paisa')->default(0);
                $table->string('payment_mode', 16)->default('cash'); // cash, bank
                $table->string('idempotency_key', 100);
                $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries')->restrictOnDelete();
                $table->foreignId('reversal_of_id')->nullable()->constrained('loan_transactions')->restrictOnDelete();
                $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
                $table->string('note', 500)->nullable();
                $table->timestamp('created_at');

                $table->unique(['branch_id', 'idempotency_key']);
                $table->index(['loan_account_id', 'business_date']);
            });
        }

        if (! Schema::hasTable('loan_correction_requests')) {
            Schema::create('loan_correction_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('loan_transaction_id')->constrained('loan_transactions')->restrictOnDelete();
                $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
                $table->string('reason', 500);
                $table->string('status', 16)->default('pending'); // pending, approved, rejected
                $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->string('decision_note', 500)->nullable();
                $table->timestamps();

                $table->index(['branch_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_correction_requests');
        Schema::dropIfExists('loan_transactions');
        Schema::dropIfExists('loan_installments');
        Schema::dropIfExists('loan_accounts');
    }
};
