<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_admission_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_admission_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('level', ['branch', 'area', 'zone', 'head_office']);
            $table->integer('sequence'); // Order: 1=branch, 2=area, 3=zone, 4=head_office
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('comments')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['member_admission_id', 'sequence']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_admission_approvals');
    }
};
