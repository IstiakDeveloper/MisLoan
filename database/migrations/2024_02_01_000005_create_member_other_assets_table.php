<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_other_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_admission_id')->constrained()->onDelete('cascade');
            $table->integer('sl_no');
            $table->string('asset_description'); // অস্থায়ী সম্পদের বিবরণ
            $table->string('quantity_amount')->nullable(); // সংখ্যা/পরিমাণ
            $table->decimal('estimated_value', 15, 2)->nullable(); // সম্ভাব্য মূল্য
            $table->timestamps();

            $table->index('member_admission_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_other_assets');
    }
};
