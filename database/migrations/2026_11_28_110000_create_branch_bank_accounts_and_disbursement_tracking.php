<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('branch_bank_accounts')) {
            Schema::create('branch_bank_accounts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
                $table->foreignId('ledger_account_id')->constrained('ledger_accounts')->restrictOnDelete();
                $table->string('bank_name', 120);
                $table->string('branch_name', 120)->nullable();
                $table->string('account_number', 64);
                $table->string('account_title', 150)->nullable();
                $table->boolean('is_default')->default(false);
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique(['branch_id', 'account_number'], 'branch_bank_account_unique');
                $table->index(['branch_id', 'is_active']);
            });
        }

        if (Schema::hasTable('loan_transactions')) {
            Schema::table('loan_transactions', function (Blueprint $table) {
                if (! Schema::hasColumn('loan_transactions', 'branch_bank_account_id')) {
                    $table->foreignId('branch_bank_account_id')
                        ->nullable()
                        ->after('payment_mode')
                        ->constrained('branch_bank_accounts')
                        ->nullOnDelete();
                }

                if (! Schema::hasColumn('loan_transactions', 'bank_reference')) {
                    $table->string('bank_reference', 100)
                        ->nullable()
                        ->after('branch_bank_account_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('loan_transactions')) {
            Schema::table('loan_transactions', function (Blueprint $table) {
                if (Schema::hasColumn('loan_transactions', 'branch_bank_account_id')) {
                    $table->dropConstrainedForeignId('branch_bank_account_id');
                }
                if (Schema::hasColumn('loan_transactions', 'bank_reference')) {
                    $table->dropColumn('bank_reference');
                }
            });
        }

        Schema::dropIfExists('branch_bank_accounts');
    }
};
