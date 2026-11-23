<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_loan_cycles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('master_admission_id')->constrained('member_admissions')->restrictOnDelete();
            $table->foreignId('source_admission_id')->nullable()->constrained('member_admissions')->nullOnDelete();
            $table->foreignId('source_loan_id')->nullable()->constrained('loan_applications')->nullOnDelete();
            $table->foreignId('admission_id')->unique()->constrained('member_admissions')->restrictOnDelete();
            $table->foreignId('loan_id')->nullable()->unique()->constrained('loan_applications')->nullOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('number');
            // Nullable unique slot: only one unfinished renewal per member.
            $table->unsignedBigInteger('open_member_id')->nullable()->unique();
            $table->string('state')->default('draft');
            $table->unsignedInteger('revision')->default(1);
            $table->json('source_snapshot');
            $table->json('admission_snapshot');
            $table->json('document_manifest')->nullable();
            $table->json('working_snapshot')->nullable();
            $table->json('submitted_snapshot')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->unique(['master_admission_id', 'number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_loan_cycles');
    }
};
