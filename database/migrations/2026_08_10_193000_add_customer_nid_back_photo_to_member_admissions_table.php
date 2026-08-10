<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            if (!Schema::hasColumn('member_admissions', 'customer_nid_back_photo_path')) {
                $table->string('customer_nid_back_photo_path')->nullable()->after('customer_nid_photo_path');
            }
            if (!Schema::hasColumn('member_admissions', 'nid_both_sides')) {
                $table->boolean('nid_both_sides')->default(false)->after('customer_nid_back_photo_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('member_admissions', function (Blueprint $table) {
            if (Schema::hasColumn('member_admissions', 'nid_both_sides')) {
                $table->dropColumn('nid_both_sides');
            }
            if (Schema::hasColumn('member_admissions', 'customer_nid_back_photo_path')) {
                $table->dropColumn('customer_nid_back_photo_path');
            }
        });
    }
};
