<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_policy_versions', function (Blueprint $table) {
            $table->id();
            $table->string('product_type', 16);
            $table->unsignedBigInteger('product_id');
            $table->date('effective_on');
            $table->json('snapshot');
            $table->char('snapshot_hash', 64);
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['product_type', 'product_id', 'effective_on'], 'product_policy_version_unique');
            $table->index(['product_type', 'product_id', 'effective_on']);
        });

        Schema::create('institution_policies', function (Blueprint $table) {
            $table->id();
            $table->string('partial_priority', 24)->nullable();
            $table->unsignedInteger('rebate_bps')->nullable();
            $table->foreignId('rebate_expense_account_id')->nullable()->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('write_off_expense_account_id')->nullable()->constrained('ledger_accounts')->restrictOnDelete();
            $table->unsignedInteger('savings_profit_bps')->nullable();
            $table->foreignId('savings_profit_expense_account_id')->nullable()->constrained('ledger_accounts')->restrictOnDelete();
            $table->boolean('reschedule_enabled')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });

        Schema::create('regulatory_account_mappings', function (Blueprint $table) {
            $table->id();
            $table->string('framework', 16);
            $table->string('line_code', 32);
            $table->string('line_name');
            $table->foreignId('ledger_account_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['framework', 'line_code']);
        });

        Schema::create('member_identities', function (Blueprint $table) {
            $table->id();
            $table->uuid('reference')->unique();
            $table->foreignId('branch_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamps();
        });

        Schema::table('member_admissions', function (Blueprint $table) {
            $table->foreignId('member_identity_id')->nullable()->after('id')->constrained('member_identities')->restrictOnDelete();
        });

        Schema::create('loan_reschedule_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_account_id')->constrained()->restrictOnDelete();
            $table->string('idempotency_key', 100)->unique();
            $table->string('reason', 1000);
            $table->string('status', 16);
            $table->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('review_note', 1000)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_reschedule_requests');
        Schema::table('member_admissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('member_identity_id');
        });
        Schema::dropIfExists('member_identities');
        Schema::dropIfExists('regulatory_account_mappings');
        Schema::dropIfExists('institution_policies');
        Schema::dropIfExists('product_policy_versions');
    }
};
