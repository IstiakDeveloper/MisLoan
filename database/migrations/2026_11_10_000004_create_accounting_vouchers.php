<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounting_vouchers', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('branch_id')->constrained()->restrictOnDelete();
            $table->string('kind', 16);
            $table->foreignId('reversal_of')->nullable()->constrained('journal_entries')->restrictOnDelete();
            $table->date('business_date');
            $table->string('description', 1000);
            $table->json('lines');
            $table->string('idempotency_key', 100);
            $table->char('payload_hash', 64);
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->string('status', 16)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('decision_note', 1000)->nullable();
            $table->foreignId('journal_entry_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->timestamp('created_at');
            $table->unique(['branch_id', 'idempotency_key']);
            $table->index(['branch_id', 'status']);
            $table->index(['reversal_of', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_vouchers');
    }
};
