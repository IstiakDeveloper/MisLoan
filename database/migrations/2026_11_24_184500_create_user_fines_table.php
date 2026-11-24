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
        Schema::create('user_fines', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_id')->unique()->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 40)->default('self_correction')->index(); // 'self_correction', 'head_office_penalty'
            $table->string('category', 100)->nullable();
            $table->text('mistake_details');
            $table->text('correction_details')->nullable();
            $table->decimal('fine_amount', 10, 2)->default(0);
            $table->string('payment_method', 30)->default('bkash');
            $table->string('payment_phone', 30)->nullable();
            $table->string('transaction_id', 60)->nullable()->index();
            $table->string('screenshot_path')->nullable();
            $table->string('status', 30)->default('pending_payment')->index(); // pending_payment, pending_review, approved, rejected, resolved
            $table->boolean('is_user_blocked')->default(false)->index();
            $table->text('admin_note')->nullable();
            $table->foreignId('resolved_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_blocked')->default(false)->after('is_active')->index();
            $table->text('blocked_reason')->nullable()->after('is_blocked');
            $table->foreignId('blocked_fine_id')->nullable()->after('blocked_reason')->constrained('user_fines')->nullOnDelete();
            $table->timestamp('blocked_at')->nullable()->after('blocked_fine_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['blocked_fine_id']);
            $table->dropColumn(['is_blocked', 'blocked_reason', 'blocked_fine_id', 'blocked_at']);
        });

        Schema::dropIfExists('user_fines');
    }
};
