<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_correction_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_transaction_id')->constrained()->restrictOnDelete();
            $table->foreignId('loan_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->string('idempotency_key', 100);
            $table->char('payload_hash', 64);
            $table->date('business_date');
            $table->string('reason', 1000);
            $table->string('status', 16)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('decision_note', 1000)->nullable();
            $table->foreignId('reversal_transaction_id')->nullable()->unique()->constrained('loan_transactions')->restrictOnDelete();
            $table->timestamp('created_at');
            $table->unique(['requested_by', 'idempotency_key'], 'loan_correction_request_key');
            $table->index(['loan_account_id', 'status']);
            $table->index(['loan_transaction_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_correction_requests');
    }
};
