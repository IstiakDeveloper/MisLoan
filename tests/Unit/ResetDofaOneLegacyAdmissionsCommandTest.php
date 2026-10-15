<?php

use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('branches');

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('previous_admission_id')->nullable();
        $table->boolean('is_legacy')->default(false);
        $table->unsignedInteger('loan_dofa')->nullable();
        $table->string('status')->default('draft');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('status')->default('draft');
        $table->timestamps();
        $table->softDeletes();
    });
});

it('resets dofa 1 old admissions to new and keeps each status', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);

    $submitted = MemberAdmission::create([
        'application_no' => '0001000001',
        'branch_id' => $branch->id,
        'status' => 'submitted',
        'is_legacy' => true,
        'loan_dofa' => 1,
    ]);
    $approved = MemberAdmission::create([
        'application_no' => '0001000002',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'is_legacy' => true,
        'loan_dofa' => 1,
    ]);
    $laterDofa = MemberAdmission::create([
        'application_no' => '0001000003',
        'branch_id' => $branch->id,
        'status' => 'approved',
        'is_legacy' => true,
        'loan_dofa' => 2,
    ]);
    $cycleCopy = MemberAdmission::create([
        'application_no' => '0001000002',
        'branch_id' => $branch->id,
        'previous_admission_id' => $approved->id,
        'status' => 'draft',
        'is_legacy' => true,
        'loan_dofa' => 1,
    ]);
    $loan = LoanApplication::create([
        'application_no' => 'LN-1',
        'member_admission_id' => $submitted->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DRAFT,
    ]);

    $this->artisan('member-admissions:reset-dofa-one-legacy', ['--force' => true])
        ->expectsOutputToContain('Reset 2 admission(s) to new.')
        ->assertSuccessful();

    $submitted->refresh();
    $approved->refresh();
    $laterDofa->refresh();
    $cycleCopy->refresh();
    $loan->refresh();

    expect((bool) $submitted->is_legacy)->toBeFalse()
        ->and($submitted->loan_dofa)->toBeNull()
        ->and($submitted->status)->toBe('submitted')
        ->and((bool) $approved->is_legacy)->toBeFalse()
        ->and($approved->loan_dofa)->toBeNull()
        ->and($approved->status)->toBe('approved')
        ->and((bool) $laterDofa->is_legacy)->toBeTrue()
        ->and((int) $laterDofa->loan_dofa)->toBe(2)
        ->and((bool) $cycleCopy->is_legacy)->toBeTrue()
        ->and((int) $cycleCopy->loan_dofa)->toBe(1)
        ->and($loan->status)->toBe(LoanApplication::STATUS_DRAFT);
});

it('dry-runs without changing admissions', function () {
    $branch = Branch::create(['name' => 'Dhaka', 'code' => '0001']);
    $admission = MemberAdmission::create([
        'application_no' => '0001000009',
        'branch_id' => $branch->id,
        'status' => 'pending_head_office',
        'is_legacy' => true,
        'loan_dofa' => 1,
    ]);

    $this->artisan('member-admissions:reset-dofa-one-legacy', ['--dry-run' => true])
        ->expectsOutputToContain('Dofa-1 old admissions: 1')
        ->expectsOutputToContain('Dry-run — nothing saved.')
        ->assertSuccessful();

    $admission->refresh();
    expect((bool) $admission->is_legacy)->toBeTrue()
        ->and((int) $admission->loan_dofa)->toBe(1)
        ->and($admission->status)->toBe('pending_head_office');
});
