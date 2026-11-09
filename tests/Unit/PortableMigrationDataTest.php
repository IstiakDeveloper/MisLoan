<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    $this->originalConnection = DB::getDefaultConnection();
    config(['database.connections.migration_sandbox' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
    DB::setDefaultConnection('migration_sandbox');
    Schema::clearResolvedInstance('db.schema');
});

afterEach(function () {
    DB::purge('migration_sandbox');
    DB::setDefaultConnection($this->originalConnection);
    Schema::clearResolvedInstance('db.schema');
});

it('preserves existing admissions and dependent rows while expanding status values', function () {
    Schema::create('member_admissions', function (Blueprint $t) {
        $t->id();
        $t->string('application_no')->unique();
        $t->enum('status', ['draft', 'submitted', 'under_review', 'approved', 'rejected'])->default('draft');
    });
    Schema::create('admission_documents', function (Blueprint $t) {
        $t->id();
        $t->foreignId('member_admission_id')->constrained()->cascadeOnDelete();
        $t->text('description');
    });
    DB::table('member_admissions')->insert(['id' => 1, 'application_no' => '0001000001', 'status' => 'approved']);
    DB::table('admission_documents')->insert(['member_admission_id' => 1, 'description' => 'পুরোনো দলিল']);
    (require database_path('migrations/2026_02_01_100330_add_pending_head_office_and_needs_revision_to_member_admissions_status.php'))->up();
    expect(DB::table('member_admissions')->find(1)->status)->toBe('approved')
        ->and(DB::table('admission_documents')->first()->description)->toBe('পুরোনো দলিল');
    DB::table('member_admissions')->where('id', 1)->update(['status' => 'pending_head_office']);
    expect(DB::table('member_admissions')->find(1)->status)->toBe('pending_head_office');
});

it('preserves historical numeric values and supports Bangla amounts after the text migration', function () {
    Schema::create('team_based_approval_items', function (Blueprint $t) {
        $t->id();
        $t->decimal('repaid_loan_amount', 15, 2)->nullable();
        $t->unsignedInteger('repaid_installment_no')->nullable();
        $t->decimal('other_institution_loan_amount', 15, 2)->nullable();
        $t->decimal('proposed_loan_amount', 15, 2)->nullable();
    });
    DB::table('team_based_approval_items')->insert(['id' => 1, 'repaid_loan_amount' => '1250.50', 'repaid_installment_no' => 12]);
    (require database_path('migrations/2026_03_10_000001_change_amount_columns_to_string_in_team_based_approval_items.php'))->up();
    (require database_path('migrations/2026_03_10_000002_increase_other_institution_loan_amount_length.php'))->up();
    expect((float) DB::table('team_based_approval_items')->find(1)->repaid_loan_amount)->toBe(1250.5);
    DB::table('team_based_approval_items')->where('id', 1)->update(['other_institution_loan_amount' => 'আশা ৫০০০, ব্রাক ২০০০']);
    expect(DB::table('team_based_approval_items')->find(1)->other_institution_loan_amount)->toBe('আশা ৫০০০, ব্রাক ২০০০');
});
