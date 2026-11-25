<?php

use App\Http\Middleware\EnsureActiveBusinessDay;
use App\Models\Area;
use App\Models\Branch;
use App\Models\PeriodReopenLog;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\AccountingPeriodService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->string('name');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('roles', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('display_name')->nullable();
        $table->text('permissions')->nullable();
        $table->timestamps();
    });
    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('username')->nullable();
        $table->string('email')->unique();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password');
        $table->text('two_factor_secret')->nullable();
        $table->text('two_factor_recovery_codes')->nullable();
        $table->timestamp('two_factor_confirmed_at')->nullable();
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->boolean('has_all_access')->default(false);
        $table->boolean('is_active')->default(true);
        $table->boolean('is_blocked')->default(false);
        $table->string('account_type')->default('staff');
        $table->rememberToken();
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('status')->default('draft');
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('status')->default('draft');
        $table->decimal('disbursed_amount', 15, 2)->default(0);
        $table->timestamp('disbursed_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('savings_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id');
        $table->string('status')->default('draft');
        $table->timestamps();
    });
    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->string('type')->nullable();
        $table->string('title')->nullable();
        $table->text('message')->nullable();
        $table->string('action_url')->nullable();
        $table->boolean('is_read')->default(false);
        $table->timestamps();
    });
    Schema::create('settings', function (Blueprint $table) {
        $table->id();
        $table->string('key')->unique();
        $table->text('value')->nullable();
        $table->timestamps();
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
    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id')->nullable();
        $table->unsignedBigInteger('user_id')->nullable();
        $table->string('level')->nullable();
        $table->integer('sequence')->default(1);
        $table->string('status')->default('pending');
        $table->timestamps();
    });
    Schema::create('member_admission_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->unsignedBigInteger('user_id')->nullable();
        $table->string('level')->nullable();
        $table->integer('sequence')->default(1);
        $table->string('status')->default('pending');
        $table->timestamps();
    });
    Schema::create('team_based_approval_reviews', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('team_based_approval_id')->nullable();
        $table->unsignedBigInteger('user_id')->nullable();
        $table->string('status')->default('pending');
        $table->timestamps();
    });
    Schema::create('loan_application_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id')->nullable();
        $table->string('status')->default('open');
        $table->timestamps();
    });
    Schema::create('member_admission_issues', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('member_admission_id')->nullable();
        $table->string('status')->default('open');
        $table->timestamps();
    });

    (require database_path('migrations/2026_11_25_181000_create_accounting_period_tables.php'))->up();
    (require database_path('migrations/2026_11_25_184000_make_period_reopen_logs_branch_nullable.php'))->up();
});

function setupPeriodActors(): array
{
    $hoRole = Role::create(['name' => Role::HEAD_OFFICE, 'display_name' => 'Head Office', 'permissions' => []]);
    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager', 'permissions' => []]);

    $zone = Zone::create(['name' => 'Zone 1', 'code' => 'Z1']);
    $area = Area::create(['zone_id' => $zone->id, 'name' => 'Area 1', 'code' => 'A1']);
    $branch = Branch::create(['area_id' => $area->id, 'name' => 'Branch 1', 'code' => 'B001', 'is_active' => true]);

    $hoUser = User::factory()->create([
        'role_id' => $hoRole->id,
        'has_all_access' => true,
        'is_active' => true,
    ]);

    $branchUser = User::factory()->create([
        'role_id' => $bmRole->id,
        'branch_id' => $branch->id,
        'has_all_access' => false,
        'is_active' => true,
    ]);

    return compact('hoUser', 'branchUser', 'branch');
}

it('requires head office to set day initial before branch can start work process', function () {
    ['hoUser' => $hoUser, 'branchUser' => $branchUser, 'branch' => $branch] = setupPeriodActors();
    $service = app(AccountingPeriodService::class);

    expect(fn () => $service->startWorkProcess($branch->id, '2026-11-01', $branchUser->id))
        ->toThrow(ValidationException::class);

    $fy = $service->openFinancialYear(2026, $hoUser->id);
    $service->setBranchDayInitial($fy->id, $branch->id, '2026-11-01', $hoUser->id);

    $day = $service->startWorkProcess($branch->id, '2026-11-01', $branchUser->id);
    expect($day->status)->toBe('open')
        ->and($day->period_date->toDateString())->toBe('2026-11-01');
});

it('blocks holidays unless explicitly allowed and enforces sequential day open and close', function () {
    ['hoUser' => $hoUser, 'branchUser' => $branchUser, 'branch' => $branch] = setupPeriodActors();
    $service = app(AccountingPeriodService::class);

    $fy = $service->openFinancialYear(2026, $hoUser->id);
    $service->setBranchDayInitial($fy->id, $branch->id, '2026-11-01', $hoUser->id);
    $service->addHoliday('2026-11-02', 'Special Holiday', 'special', null, $hoUser->id);

    $service->startWorkProcess($branch->id, '2026-11-01', $branchUser->id);

    // Cannot open another day while 2026-11-01 is still open
    expect(fn () => $service->startWorkProcess($branch->id, '2026-11-03', $branchUser->id))
        ->toThrow(ValidationException::class);

    // Close day 1
    $closed = $service->completeWorkProcess($branch->id, '2026-11-01', 'Cash matched', $branchUser->id);
    expect($closed->status)->toBe('closed');

    // Cannot open holiday without allowHoliday
    expect(fn () => $service->startWorkProcess($branch->id, '2026-11-02', $branchUser->id))
        ->toThrow(ValidationException::class);

    // Cannot backdate to <= last closed day
    expect(fn () => $service->startWorkProcess($branch->id, '2026-11-01', $branchUser->id))
        ->toThrow(ValidationException::class);

    // Next working day opens cleanly
    $day3 = $service->startWorkProcess($branch->id, '2026-11-03', $branchUser->id);
    expect($day3->period_date->toDateString())->toBe('2026-11-03');
});

it('runs llp and monthly process, locks closed month, and logs head office reopen', function () {
    ['hoUser' => $hoUser, 'branchUser' => $branchUser, 'branch' => $branch] = setupPeriodActors();
    $service = app(AccountingPeriodService::class);

    $fy = $service->openFinancialYear(2026, $hoUser->id);
    $service->setBranchDayInitial($fy->id, $branch->id, '2026-11-01', $hoUser->id);
    $service->startWorkProcess($branch->id, '2026-11-01', $branchUser->id);

    // Monthly process fails while a day is still open
    expect(fn () => $service->runMonthlyProcess($branch->id, '2026-11-15', true, $branchUser->id))
        ->toThrow(ValidationException::class);

    $service->completeWorkProcess($branch->id, '2026-11-01', null, $branchUser->id);

    $llp = $service->runLlpVoucherProcess($branch->id, '2026-11-15', $branchUser->id);
    expect($llp->llp_processed_at)->not->toBeNull();

    $monthProcess = $service->runMonthlyProcess($branch->id, '2026-11-15', true, $branchUser->id);
    expect($monthProcess->status)->toBe('closed');

    // Closed month blocks opening any new day in November
    expect(fn () => $service->startWorkProcess($branch->id, '2026-11-02', $branchUser->id))
        ->toThrow(ValidationException::class);

    // Head Office reopens closed month with audit log
    $service->reopenPeriod($branch->id, 'month', '2026-11-30', 'Audit correction needed', $hoUser->id);
    expect(PeriodReopenLog::query()->where('branch_id', $branch->id)->count())->toBe(1);

    // Now branch can open 2026-11-02
    $day2 = $service->startWorkProcess($branch->id, '2026-11-02', $branchUser->id);
    expect($day2->status)->toBe('open');
});

it('enforces active business day middleware and head office permissions', function () {
    ['hoUser' => $hoUser, 'branchUser' => $branchUser, 'branch' => $branch] = setupPeriodActors();
    $service = app(AccountingPeriodService::class);

    // Branch user cannot access Head Office accounting-periods
    $this->actingAs($branchUser)
        ->get('/head-office/accounting-periods')
        ->assertForbidden();

    // Head Office can access accounting-periods
    $this->actingAs($hoUser)
        ->get('/head-office/accounting-periods')
        ->assertOk();

    // Branch user can access /branch/process
    $this->actingAs($branchUser)
        ->get('/branch/process')
        ->assertOk();

    // Middleware blocks branch user when no day is open
    $middleware = app(EnsureActiveBusinessDay::class);
    $req = Request::create('/dummy', 'POST');
    $req->setUserResolver(fn () => $branchUser);
    $req->headers->set('Accept', 'application/json');

    $blocked = $middleware->handle($req, fn () => new Response('OK'));
    expect($blocked->getStatusCode())->toBe(422);

    // Open a day and verify middleware passes
    $fy = $service->openFinancialYear(2026, $hoUser->id);
    $service->setBranchDayInitial($fy->id, $branch->id, '2026-11-25', $hoUser->id);
    $service->startWorkProcess($branch->id, '2026-11-25', $branchUser->id);

    $allowed = $middleware->handle($req, fn () => new Response('OK'));
    expect($allowed->getStatusCode())->toBe(200)
        ->and($req->attributes->get('active_business_date'))->toBe('2026-11-25');
});

it('allows super admin to rollback a closed financial year with audit log', function () {
    ['hoUser' => $hoUser, 'branchUser' => $branchUser, 'branch' => $branch] = setupPeriodActors();
    $service = app(AccountingPeriodService::class);

    $fy = $service->openFinancialYear(2026, $hoUser->id);
    $service->closeFinancialYear($fy->id, 'Accidental close', $hoUser->id);
    expect($fy->fresh()->isClosed())->toBeTrue();

    // Branch user cannot reopen financial year
    $this->actingAs($branchUser)
        ->post("/head-office/accounting-periods/financial-years/{$fy->id}/reopen", [
            'reason' => 'Branch should not be allowed',
        ])
        ->assertForbidden();

    // Super admin / has_all_access user can rollback financial year
    $this->actingAs($hoUser)
        ->post("/head-office/accounting-periods/financial-years/{$fy->id}/reopen", [
            'reason' => 'Closed by mistake, rolling back',
        ])
        ->assertRedirect();

    expect($fy->fresh()->isClosed())->toBeFalse()
        ->and(PeriodReopenLog::query()->where('kind', 'year')->whereNull('branch_id')->count())->toBe(1);
});
