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
        Schema::create('loan_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_application_id')->constrained()->onDelete('cascade');
            $table->integer('serial_no'); // ক্রমিক নং

            // সমিতি তথ্য (Committee/Somiti Information)
            $table->string('somiti_name')->nullable(); // সমিতির নাম
            $table->string('somiti_code')->nullable(); // সমিতি কোড

            // সদস্য তথ্য (Member Information)
            $table->string('member_name'); // সদস্যের নাম
            $table->string('member_code')->nullable(); // সদস্য কোড
            $table->string('member_mobile')->nullable(); // সদস্য মোবাইল নম্বর


            // সঞ্চয় তথ্য (Savings Information)
            $table->decimal('general_savings', 12, 2)->nullable(); // সাধারণ সঞ্চয়
            $table->decimal('total_savings', 12, 2)->nullable(); // মোট সঞ্চয়

            // গত ঋণের তথ্য (Last Paid Loan Information)
            $table->decimal('principal_amount', 12, 2)->nullable(); // মূল ঋণ
            $table->integer('paid_installment_count')->nullable(); // কত কিস্তিতে পরিশোধ করা হয়েছে

            // বর্তমান বিতরণের তথ্য (Current Distribution Information)
            $table->decimal('approved_loan_amount', 12, 2)->nullable(); // অনুমোদিত ঋণের পরিমাণ
            $table->decimal('installment_increment_rate', 5, 2)->nullable(); // ঋণের কিস্তির বৃদ্ধির হার (%)
            $table->integer('loan_duration')->nullable(); // ঋণের মেয়াদ
            $table->integer('phase_no')->nullable(); // দফা নং
            $table->string('project_name')->nullable(); // প্রকল্পের নাম

            // দল ভিত্তিক তথ্য (Team-based Information)
            $table->date('loan_release_or_approval_date')->nullable(); // ঋণ ছাড়ের/অনুমোদনের তারিখ
            $table->date('loan_distribution_date')->nullable(); // ঋণ বিতরণের তারিখ
            $table->string('approved_by')->nullable(); // ছাড়কারী/অনুমোদনকারী কর্মকর্তার নাম

            // মন্তব্য (Remarks)
            $table->text('remarks')->nullable(); // মন্তব্য

            // স্ট্যাটাস (System fields)
            $table->enum('status', ['pending', 'approved', 'rejected', 'issue'])->default('pending'); // অবস্থা

            $table->timestamps();
            $table->softDeletes(); // Add soft deletes support

            $table->index('loan_application_id');
            $table->index('member_name');
            $table->index('member_mobile');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_members');
    }
};
