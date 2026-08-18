<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (!Schema::hasColumn('loan_applications', 'disbursed_amount')) {
                $table->decimal('disbursed_amount', 12, 2)->nullable()->after('approved_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (Schema::hasColumn('loan_applications', 'disbursed_amount')) {
                $table->dropColumn('disbursed_amount');
            }
        });
    }
};
