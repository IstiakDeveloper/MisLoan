<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_family_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_admission_id')->constrained()->onDelete('cascade');
            $table->integer('sl_no');
            $table->string('member_name');
            $table->string('relation_with_head'); // সম্পর্ক
            $table->enum('gender', ['male', 'female', 'other']);
            $table->integer('age_years')->nullable();
            $table->integer('age_months')->nullable();
            $table->string('education_level')->nullable(); // শিক্ষাগত যোগ্যতা
            $table->string('occupation')->nullable(); // পেশা
            $table->decimal('monthly_income', 12, 2)->nullable(); // মাসিক আয়
            $table->timestamps();

            $table->index('member_admission_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_family_members');
    }
};
