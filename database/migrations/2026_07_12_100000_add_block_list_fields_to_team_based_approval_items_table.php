<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->string('name_bn')->nullable()->after('member_name');
            $table->string('father_name')->nullable()->after('name_bn');
            $table->string('mother_name')->nullable()->after('father_name');
            $table->string('spouse_name')->nullable()->after('mother_name');
            $table->date('dob')->nullable()->after('spouse_name');
            $table->string('nid_number')->nullable()->after('dob');
            $table->text('address')->nullable()->after('nid_number');
        });
    }

    public function down(): void
    {
        Schema::table('team_based_approval_items', function (Blueprint $table) {
            $table->dropColumn([
                'name_bn',
                'father_name',
                'mother_name',
                'spouse_name',
                'dob',
                'nid_number',
                'address',
            ]);
        });
    }
};
