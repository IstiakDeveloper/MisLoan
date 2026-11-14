<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gl_posting_defaults', function (Blueprint $table) {
            $table->foreignId('loan_rebate_expense_account_id')->nullable()->after('loan_cash_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->foreignId('savings_profit_expense_account_id')->nullable()->after('savings_cash_account_id')->constrained('ledger_accounts')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('gl_posting_defaults', function (Blueprint $table) {
            $table->dropConstrainedForeignId('loan_rebate_expense_account_id');
            $table->dropConstrainedForeignId('savings_profit_expense_account_id');
        });
    }
};
