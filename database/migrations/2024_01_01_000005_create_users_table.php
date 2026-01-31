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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Can be Bangla or English
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('username')->unique(); // Branch code or custom username
            $table->string('password');
            $table->foreignId('role_id')->constrained()->onDelete('cascade');

            // Access level fields - user can access one or multiple
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('area_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('zone_id')->nullable()->constrained()->onDelete('cascade');
            $table->boolean('has_all_access')->default(false); // For super admin

            $table->string('profile_photo')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();

            $table->index('role_id');
            $table->index('branch_id');
            $table->index('area_id');
            $table->index('zone_id');
            $table->index('username');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
