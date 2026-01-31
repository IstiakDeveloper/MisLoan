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
        Schema::create('admission_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_admission_id')->constrained()->onDelete('cascade');

            // Branch, Officer, Component, Society info
            $table->string('branch_name')->nullable();
            $table->string('officer_name')->nullable();
            $table->string('component_name')->nullable();
            $table->string('society_name')->nullable();

            // Member details
            $table->string('member_name');
            $table->string('mobile');

            // NID image paths
            $table->string('nid_front_image');
            $table->string('nid_back_image');

            // Land information (বসতবাড়ী, আবাদী, মোট)
            $table->decimal('residential_property', 15, 2)->nullable(); // বসতবাড়ী
            $table->decimal('cultivable_land', 15, 2)->nullable(); // আবাদী
            $table->decimal('total_land', 15, 2)->nullable(); // মোট

            // Livestock information (গরু, ছাগল, হাঁস/মুরগী)
            $table->integer('cattle_count')->nullable(); // গরু
            $table->integer('goat_count')->nullable(); // ছাগল
            $table->integer('poultry_count')->nullable(); // হাঁস/মুরগী

            // Assets value
            $table->decimal('fixed_movable_assets_value', 15, 2)->nullable(); // স্থাবর ও অস্থাবর সম্পদের মূল্য

            // Income and occupation information
            $table->string('earning_person_occupation')->nullable(); // উপার্জন কারীর পেষা
            $table->decimal('family_monthly_income', 15, 2)->nullable(); // পরিবারের মাসিক আয়

            // Guarantor information
            $table->string('guarantor_name')->nullable(); // জামিনদারের নাম
            $table->string('guarantor_relation')->nullable(); // সদস্যের সাথে জামিনদারের সম্পর্ক

            // Remarks
            $table->text('remarks')->nullable(); // মন্তব্য

            // Status tracking
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();

            // Excel row reference
            $table->integer('excel_row_number')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('member_admission_id');
            $table->index('mobile');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admission_members');
    }
};
