<?php

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\Role;
use App\Models\User;
use App\Services\ApprovalService;
use App\Services\Dashboard\PipelineRollup;
use App\Services\NavBadgeService;
use App\Services\VerificationIndexQuery;
use Carbon\Carbon;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropAllTables();

    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('display_name')->nullable();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('username')->nullable();
        $table->string('name');
        $table->string('email')->nullable();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password')->nullable();
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->boolean('has_all_access')->default(false);
        $table->boolean('is_active')->default(true);
        $table->text('two_factor_secret')->nullable();
        $table->text('two_factor_recovery_codes')->nullable();
        $table->timestamp('two_factor_confirmed_at')->nullable();
        $table->rememberToken();
        $table->softDeletes();
        $table->timestamps();
    });

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->string('code')->nullable();
        $table->string('name')->nullable();
        $table->boolean('is_active')->default(true);
        $table->softDeletes();
    });

    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->softDeletes();
    });

    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('code')->nullable();
        $table->softDeletes();
    });

    Schema::create('user_branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('branch_id');
        $table->timestamps();
    });

    Schema::create('user_areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('area_id');
        $table->timestamps();
    });

    Schema::create('user_zones', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('zone_id');
        $table->timestamps();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('application_no')->nullable();
        $table->string('member_code')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->string('status')->nullable();
        $table->timestamp('submitted_at')->nullable();
        $table->text('revision_comments')->nullable();
        $table->timestamp('reviewed_at')->nullable();
        $table->unsignedBigInteger('submitted_by')->nullable();
        $table->unsignedBigInteger('assigned_officer_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->string('application_no')->nullable();
        $table->string('member_code')->nullable();
        $table->string('applicant_name_bn')->nullable();
        $table->string('status')->nullable();
        $table->decimal('requested_amount', 14, 2)->default(0);
        $table->decimal('approved_amount', 14, 2)->default(0);
        $table->decimal('disbursed_amount', 14, 2)->default(0);
        $table->timestamp('submitted_at')->nullable();
        $table->timestamp('reviewed_at')->nullable();
        $table->softDeletes();
        $table->timestamps();
    });

    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->string('status')->nullable();
        $table->text('issue_description')->nullable();
        $table->text('resolution_note')->nullable();
        $table->timestamp('zm_approved_at')->nullable();
        $table->timestamp('resolved_at')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->string('status')->nullable();
        $table->text('issue_description')->nullable();
        $table->text('response_message')->nullable();
        $table->timestamp('zm_approved_at')->nullable();
        $table->timestamp('responded_at')->nullable();
        $table->timestamps();
    });

    Schema::create('member_admission_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id');
        $table->unsignedBigInteger('user_id')->nullable();
        $table->unsignedInteger('sequence')->default(1);
        $table->string('status')->nullable();
        $table->string('level')->nullable();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('user_id')->nullable();
        $table->unsignedInteger('sequence')->default(1);
        $table->string('status')->nullable();
        $table->string('level')->nullable();
    });
});

it('counts navigation badges in a fixed query budget', function () {
    $role = Role::query()->create([
        'name' => Role::BRANCH_MANAGER,
        'display_name' => 'Branch Manager',
    ]);
    DB::table('branches')->insert(['id' => 1, 'code' => '12', 'name' => 'Branch']);
    $user = User::factory()->create([
        'role_id' => $role->id,
        'branch_id' => 1,
        'has_all_access' => false,
        'is_active' => true,
    ]);

    DB::flushQueryLog();
    DB::enableQueryLog();

    $counts = app(NavBadgeService::class)->forUser($user);

    expect($counts)->toMatchArray([
        'pendingLoanApplications' => 0,
        'pendingAdmissions' => 0,
        'pendingApprovals' => 0,
        'pendingClusterHandovers' => 0,
        'pendingVerifications' => 0,
    ]);
    expect(count(DB::getQueryLog()))->toBeLessThan(16);
});

it('counts only the current admission approval step in one query', function () {
    $user = User::factory()->create();
    $now = now();
    DB::table('member_admissions')->insert([
        ['id' => 1, 'status' => 'submitted', 'created_at' => $now, 'updated_at' => $now],
        ['id' => 2, 'status' => 'submitted', 'created_at' => $now, 'updated_at' => $now],
        ['id' => 3, 'status' => 'submitted', 'created_at' => $now, 'updated_at' => $now],
    ]);
    DB::table('member_admission_approvals')->insert([
        ['member_admission_id' => 1, 'user_id' => $user->id, 'sequence' => 1, 'status' => 'pending', 'level' => 'branch'],
        ['member_admission_id' => 2, 'user_id' => 99, 'sequence' => 1, 'status' => 'approved', 'level' => 'branch'],
        ['member_admission_id' => 2, 'user_id' => $user->id, 'sequence' => 2, 'status' => 'pending', 'level' => 'area'],
        ['member_admission_id' => 3, 'user_id' => 99, 'sequence' => 1, 'status' => 'pending', 'level' => 'branch'],
        ['member_admission_id' => 3, 'user_id' => $user->id, 'sequence' => 2, 'status' => 'pending', 'level' => 'area'],
    ]);

    DB::flushQueryLog();
    DB::enableQueryLog();

    $count = app(ApprovalService::class)->countCurrentPendingAdmissionsForUser($user);

    expect($count)->toBe(2);
    expect(DB::getQueryLog())->toHaveCount(1);
});

it('counts only the current loan approval step in one query', function () {
    $user = User::factory()->create();
    $now = now();
    DB::table('loan_applications')->insert([
        ['id' => 1, 'status' => 'submitted', 'created_at' => $now, 'updated_at' => $now],
        ['id' => 2, 'status' => 'submitted', 'created_at' => $now, 'updated_at' => $now],
        ['id' => 3, 'status' => 'under_review', 'created_at' => $now, 'updated_at' => $now],
    ]);
    DB::table('loan_application_approvals')->insert([
        ['loan_application_id' => 1, 'user_id' => $user->id, 'sequence' => 1, 'status' => 'pending', 'level' => 'branch'],
        ['loan_application_id' => 2, 'user_id' => 99, 'sequence' => 1, 'status' => 'pending', 'level' => 'branch'],
        ['loan_application_id' => 2, 'user_id' => $user->id, 'sequence' => 2, 'status' => 'pending', 'level' => 'area'],
        ['loan_application_id' => 3, 'user_id' => 99, 'sequence' => 1, 'status' => 'pending', 'level' => 'branch'],
        ['loan_application_id' => 3, 'user_id' => $user->id, 'sequence' => 2, 'status' => 'pending', 'level' => 'area'],
    ]);

    DB::flushQueryLog();
    DB::enableQueryLog();

    $count = app(ApprovalService::class)->currentPendingLoanApprovalsQuery($user)->count();

    expect($count)->toBe(2);
    expect(DB::getQueryLog())->toHaveCount(1);
});

it('rolls pipeline counts up with grouped queries and skips an empty scope', function () {
    DB::table('member_admissions')->insert([
        ['branch_id' => 1, 'status' => 'submitted', 'created_at' => now(), 'updated_at' => now()],
        ['branch_id' => 1, 'status' => 'approved', 'created_at' => now(), 'updated_at' => now()],
        ['branch_id' => 2, 'status' => 'submitted', 'created_at' => now(), 'updated_at' => now()],
    ]);
    DB::table('loan_applications')->insert([
        'branch_id' => 1,
        'status' => 'submitted',
        'requested_amount' => 500,
        'approved_amount' => 0,
        'disbursed_amount' => 0,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::flushQueryLog();
    DB::enableQueryLog();

    $rollup = app(PipelineRollup::class);
    $admissions = $rollup->admissionCounts([1]);
    $loans = $rollup->loanRollup([1]);

    expect($admissions['submitted'])->toBe(1);
    expect($admissions['approved'])->toBe(1);
    expect($loans['submitted']['count'])->toBe(1);
    expect($loans['submitted']['requested_amount'])->toBe(500.0);
    expect($rollup->admissionCounts([]))->toBe([]);

    $queries = collect(DB::getQueryLog())->pluck('query');
    expect($queries->filter(fn (string $sql) => str_contains(strtolower($sql), 'group by')))->toHaveCount(3);
    expect($queries->filter(fn (string $sql) => str_contains($sql, '0 = 1')))->toHaveCount(1);
});

it('returns one verification page and counts a real reply without loading issue text', function () {
    DB::table('branches')->insert(['id' => 1, 'area_id' => 1, 'code' => '12', 'name' => 'Branch']);
    DB::table('areas')->insert(['id' => 1, 'zone_id' => 1]);
    DB::table('zones')->insert(['id' => 1, 'code' => 'Z']);

    $now = Carbon::now();
    $admissions = [];
    $issues = [];
    for ($id = 1; $id <= 25; $id++) {
        $admissions[] = [
            'id' => $id,
            'branch_id' => 1,
            'application_no' => 'A-'.$id,
            'applicant_name_bn' => 'সদস্য '.$id,
            'status' => 'pending_head_office',
            'submitted_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $issues[] = [
            'member_admission_id' => $id,
            'status' => 'pending',
            'issue_description' => 'সমস্যা',
            'resolution_note' => $id === 25
                ? 'হেড অফিস ভেরিফিকেশন থেকে অনুমোদিত'
                : 'শাখা উত্তর দিয়েছে',
            'created_at' => $now,
            'updated_at' => $now,
        ];
    }
    DB::table('member_admissions')->insert($admissions);
    DB::table('member_admission_issues')->insert($issues);

    DB::flushQueryLog();
    DB::enableQueryLog();

    $page = app(VerificationIndexQuery::class)->page(
        MemberAdmission::query(),
        LoanApplication::query()->whereRaw('0 = 1'),
        'all',
        'pending_action',
        $now->copy()->startOfDay(),
        $now->copy()->endOfDay(),
        1,
        20,
    );

    expect($page['total'])->toBe(25);
    expect($page['rows'])->toHaveCount(20);
    expect($page['rows']->contains(fn ($row) => property_exists($row, 'issue_description')))->toBeFalse();
    expect($page['stats']['total'])->toBe(25);
    expect($page['stats']['pending_action'])->toBe(25);
    expect($page['stats']['branch_replied'])->toBe(24);
    expect($page['stats']['pending_issues'])->toBe(1);

    $sql = collect(DB::getQueryLog())->pluck('query')->implode("\n");
    expect(str_contains(strtolower($sql), 'union'))->toBeTrue();
    expect(count(DB::getQueryLog()))->toBeLessThan(8);
});
