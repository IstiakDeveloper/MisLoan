<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('app_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('samity_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('member_admission_id')->nullable()->constrained('member_admissions')->nullOnDelete();

            $table->string('member_code', 50)->index();
            $table->string('member_name', 191);
            $table->string('phone_number', 30)->nullable();

            $table->boolean('is_registered')->default(true)->index();
            $table->timestamp('registered_at')->nullable()->index();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('registration_source', ['admission_switch', 'single_entry', 'bulk_excel'])->default('admission_switch');
            $table->string('remarks', 255)->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['branch_id', 'is_registered']);
            $table->index(['branch_id', 'member_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_registrations');
    }
};

