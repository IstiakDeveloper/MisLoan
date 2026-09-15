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
        $table->string('status')->default('approved');
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('status')->default('draft');
        $table->decimal('requested_amount', 12, 2)->nullable();
        $table->timestamp('submitted_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
});

it('dry-runs duplicate cleanup without deleting', function () {
    $branch = Branch::create(['name' => 'Akkelpur', 'code' => '0037']);
    $member = MemberAdmission::create([
        'application_no' => '0037370345',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    LoanApplication::create([
        'application_no' => 'LN-OLD',
        'member_admission_id' => $member->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'submitted_at' => now()->subHour(),
    ]);
    LoanApplication::create([
        'application_no' => 'LN-NEW',
        'member_admission_id' => $member->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'submitted_at' => now(),
    ]);

    $this->artisan('loans:remove-duplicate-forms', ['--dry-run' => true])
        ->expectsOutputToContain('Will keep: 1')
        ->expectsOutputToContain('Will remove: 1')
        ->expectsOutputToContain('Dry-run — nothing deleted.')
        ->assertSuccessful();

    expect(LoanApplication::query()->count())->toBe(2);
});

it('keeps the latest submitted form and never deletes a disbursed loan', function () {
    $branch = Branch::create(['name' => 'Akkelpur', 'code' => '0037']);
    $memberA = MemberAdmission::create([
        'application_no' => '0037370345',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);
    $memberB = MemberAdmission::create([
        'application_no' => '0002005146',
        'branch_id' => $branch->id,
        'status' => 'approved',
    ]);

    $keepSubmitted = LoanApplication::create([
        'application_no' => 'LN-KEEP',
        'member_admission_id' => $memberA->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'submitted_at' => now(),
    ]);
    $dropDraft = LoanApplication::create([
        'application_no' => 'LN-DROP',
        'member_admission_id' => $memberA->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DRAFT,
        'submitted_at' => now()->subHour(),
    ]);

    $disbursed = LoanApplication::create([
        'application_no' => 'LN-DISBURSED',
        'member_admission_id' => $memberB->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_DISBURSED,
        'submitted_at' => now()->subDay(),
    ]);
    $extraQueue = LoanApplication::create([
        'application_no' => 'LN-QUEUE',
        'member_admission_id' => $memberB->id,
        'branch_id' => $branch->id,
        'status' => LoanApplication::STATUS_PENDING_DISBURSEMENT,
        'submitted_at' => now(),
    ]);

    $this->artisan('loans:remove-duplicate-forms', ['--force' => true])
        ->expectsOutputToContain('Will keep: 2')
        ->expectsOutputToContain('Will remove: 2')
        ->expectsOutputToContain('Soft-deleted 2 extra loan form(s).')
        ->assertSuccessful();

    expect(LoanApplication::query()->pluck('id')->sort()->values()->all())
        ->toBe([$keepSubmitted->id, $disbursed->id])
        ->and(LoanApplication::onlyTrashed()->pluck('id')->sort()->values()->all())
        ->toBe([$dropDraft->id, $extraQueue->id]);
});
