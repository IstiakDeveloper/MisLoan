<?php

use App\Http\Controllers\HeadOffice\BranchLoanPendingReportController;
use App\Models\Area;
use App\Models\Branch;
use App\Models\LoanApplication;
use App\Models\LoanApplicationApproval;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\BranchLoanPendingReportService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

function createBranchPendingReportTables(): void
{
    Schema::dropIfExists('loan_application_approvals');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('user_zones');
    Schema::dropIfExists('user_areas');
    Schema::dropIfExists('user_branches');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');
    Schema::dropIfExists('areas');
    Schema::dropIfExists('zones');

    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name')->nullable();
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name')->nullable();
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
        $table->text('description')->nullable();
        $table->text('permissions')->nullable();
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('password')->default('secret');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->boolean('has_all_access')->default(false);
        $table->string('account_type')->nullable();
        $table->string('phone')->nullable();
        $table->string('pin')->nullable();
        $table->string('signature')->nullable();
        $table->timestamps();
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

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('status')->default('draft');
        $table->timestamp('submitted_at')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_application_approvals', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_application_id');
        $table->unsignedBigInteger('user_id');
        $table->string('level')->default('branch');
        $table->unsignedInteger('sequence')->default(1);
        $table->string('status')->default('pending');
        $table->timestamps();
    });
}

function pendingReportRole(string $name): Role
{
    return Role::create([
        'name' => $name,
        'display_name' => $name,
    ]);
}

function pendingReportUser(Role $role, string $email, ?int $branchId = null): User
{
    return User::create([
        'name' => $role->display_name.' '.$email,
        'email' => $email,
        'password' => 'password',
        'role_id' => $role->id,
        'branch_id' => $branchId,
        'is_active' => true,
    ]);
}

function pendingReportBranch(string $name, string $code, Area $area, bool $active = true): Branch
{
    return Branch::create([
        'name' => $name,
        'code' => $code,
        'area_id' => $area->id,
        'is_active' => $active,
    ]);
}

function pendingReportLoan(
    Branch $branch,
    string $status,
    ?string $submittedAt,
    string $createdAt = '2026-10-10 12:00:00',
): LoanApplication {
    $loan = LoanApplication::create([
        'application_no' => 'LN-'.$branch->code.'-'.uniqid(),
        'branch_id' => $branch->id,
        'status' => $status,
    ]);

    $loan->timestamps = false;
    $loan->forceFill([
        'submitted_at' => $submittedAt,
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ])->save();

    return $loan->fresh();
}

function pendingReportApproval(
    LoanApplication $loan,
    User $user,
    string $level,
    int $sequence,
    string $status = 'pending',
): void {
    LoanApplicationApproval::create([
        'loan_application_id' => $loan->id,
        'user_id' => $user->id,
        'level' => $level,
        'sequence' => $sequence,
        'status' => $status,
    ]);
}

/**
 * @return array{zone: Zone, area: Area, branch: Branch}
 */
function pendingReportOrg(string $zoneName = 'North', string $areaName = 'Sadar', string $branchName = 'Nazipur', string $code = '0017'): array
{
    $zone = Zone::create(['name' => $zoneName, 'code' => $code.'Z', 'is_active' => true]);
    $area = Area::create(['name' => $areaName, 'code' => $code.'A', 'zone_id' => $zone->id, 'is_active' => true]);
    $branch = pendingReportBranch($branchName, $code, $area);

    return compact('zone', 'area', 'branch');
}

function pendingReportRow(Branch $branch, string $from = '2026-10-01', string $to = '2026-10-17'): array
{
    $report = app(BranchLoanPendingReportService::class)->build(null, $from, $to);

    $row = collect($report['rows'])->firstWhere('branch_id', $branch->id);
    expect($row)->not->toBeNull();

    $columnSum = 0;
    foreach (BranchLoanPendingReportService::COLUMN_KEYS as $key) {
        $columnSum += (int) $row[$key];
    }
    expect($columnSum)->toBe((int) $row['total'])
        ->and((int) $report['totals']['total'])->toBe(
            collect($report['rows'])->sum('total')
        );

    return $row;
}

function pendingReportPage(User $user, array $query, string $method = 'index'): array
{
    test()->actingAs($user);

    $request = Request::create('/reports/branch-loan-pending', 'GET', $query);
    $request->setUserResolver(fn () => $user);
    app()->instance('request', $request);

    $response = app(BranchLoanPendingReportController::class)->{$method}($request);
    expect($response)->toBeInstanceOf(InertiaResponse::class);

    return (new ReflectionProperty(InertiaResponse::class, 'props'))->getValue($response);
}

it('numbers branches in branch code order', function () {
    createBranchPendingReportTables();
    ['area' => $area] = pendingReportOrg('North', 'Sadar', 'Later', '0010');
    pendingReportBranch('Middle', '0002', $area);
    pendingReportBranch('First', '0001', $area);

    $report = app(BranchLoanPendingReportService::class)->build(null, '2026-10-01', '2026-10-17');

    expect(collect($report['rows'])->pluck('branch_code')->all())->toBe(['0001', '0002', '0010'])
        ->and(collect($report['rows'])->pluck('serial')->all())->toBe([1, 2, 3])
        ->and(collect($report['rows'])->pluck('branch_name')->all())->toBe(['First', 'Middle', 'Later']);
});

it('counts several branch manager rows on one loan a single time', function () {
    createBranchPendingReportTables();
    ['branch' => $branch] = pendingReportOrg();
    $bmRole = pendingReportRole(Role::BRANCH_MANAGER);
    $first = pendingReportUser($bmRole, 'bm1@test.com', $branch->id);
    $second = pendingReportUser($bmRole, 'bm2@test.com', $branch->id);

    $loan = pendingReportLoan($branch, LoanApplication::STATUS_SUBMITTED, '2026-10-05 09:00:00');
    pendingReportApproval($loan, $first, 'branch', 1);
    pendingReportApproval($loan, $second, 'branch', 1);
    pendingReportLoan($branch, LoanApplication::STATUS_SUBMITTED, '2026-10-05 11:00:00');

    $row = pendingReportRow($branch);

    expect($row['bm'])->toBe(2)
        ->and($row['am'])->toBe(0)
        ->and($row['total'])->toBe(2);
});

it('counts a loan forwarded to the area manager only in AM', function () {
    createBranchPendingReportTables();
    ['branch' => $branch] = pendingReportOrg();
    $bm = pendingReportUser(pendingReportRole(Role::BRANCH_MANAGER), 'bm@test.com', $branch->id);
    $am = pendingReportUser(pendingReportRole(Role::AREA_MANAGER), 'am@test.com');

    $loan = pendingReportLoan($branch, LoanApplication::STATUS_UNDER_REVIEW, '2026-10-06 09:00:00');
    pendingReportApproval($loan, $bm, 'branch', 1, 'approved');
    pendingReportApproval($loan, $am, 'area', 2);

    $row = pendingReportRow($branch);

    expect($row['am'])->toBe(1)
        ->and($row['bm'])->toBe(0)
        ->and($row['total'])->toBe(1);
});

it('keeps amount and cancellation approvals out of the approver columns', function () {
    createBranchPendingReportTables();
    ['branch' => $branch] = pendingReportOrg();
    $bm = pendingReportUser(pendingReportRole(Role::BRANCH_MANAGER), 'bm@test.com', $branch->id);

    $amount = pendingReportLoan($branch, LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL, '2026-10-07 09:00:00');
    pendingReportApproval($amount, $bm, 'branch', 2);

    $cancellation = pendingReportLoan($branch, LoanApplication::STATUS_PENDING_CANCELLATION, '2026-10-08 09:00:00');
    pendingReportApproval($cancellation, $bm, 'branch', 2);

    $row = pendingReportRow($branch);

    expect($row['aa'])->toBe(1)
        ->and($row['pc'])->toBe(1)
        ->and($row['bm'])->toBe(0)
        ->and($row['total'])->toBe(2);
});

it('puts disbursement waiting and approved loans only in DW', function () {
    createBranchPendingReportTables();
    ['branch' => $branch] = pendingReportOrg();

    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_DISBURSEMENT, '2026-10-04 09:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_APPROVED, '2026-10-04 10:00:00');

    $row = pendingReportRow($branch);

    expect($row['dw'])->toBe(2)
        ->and($row['bm'])->toBe(0)
        ->and($row['total'])->toBe(2);
});

it('includes both date edges and a loan whose submitted date is empty', function () {
    createBranchPendingReportTables();
    ['branch' => $branch] = pendingReportOrg();

    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_HEAD_OFFICE, '2026-10-01 00:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_HEAD_OFFICE, '2026-10-17 23:59:59');
    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_HEAD_OFFICE, '2026-09-30 23:59:59');
    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_HEAD_OFFICE, '2026-10-18 00:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_READY_FOR_HEAD_OFFICE, null, '2026-10-09 08:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_READY_FOR_HEAD_OFFICE, null, '2026-09-01 08:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_DRAFT, '2026-10-09 08:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_DISBURSED, '2026-10-09 08:00:00');

    $row = pendingReportRow($branch);

    expect($row['ho'])->toBe(2)
        ->and($row['rh'])->toBe(1)
        ->and($row['total'])->toBe(3);
});

it('keeps every pending stage in one column and the row total equal to that sum', function () {
    createBranchPendingReportTables();
    ['branch' => $branch] = pendingReportOrg();
    $bm = pendingReportUser(pendingReportRole(Role::BRANCH_MANAGER), 'bm@test.com', $branch->id);
    $am = pendingReportUser(pendingReportRole(Role::AREA_MANAGER), 'am@test.com');
    $zm = pendingReportUser(pendingReportRole(Role::ZONE_MANAGER), 'zm@test.com');
    $admf = pendingReportUser(pendingReportRole(Role::ADMF), 'admf@test.com');
    $dmf = pendingReportUser(pendingReportRole(Role::DMF), 'dmf@test.com');
    $ed = pendingReportUser(pendingReportRole(Role::ED), 'ed@test.com');

    $submitted = pendingReportLoan($branch, LoanApplication::STATUS_SUBMITTED, '2026-10-02 09:00:00');
    pendingReportApproval($submitted, $bm, 'branch', 1);

    $atArea = pendingReportLoan($branch, LoanApplication::STATUS_UNDER_REVIEW, '2026-10-02 10:00:00');
    pendingReportApproval($atArea, $bm, 'branch', 1, 'approved');
    pendingReportApproval($atArea, $am, 'area', 2);

    $atZone = pendingReportLoan($branch, LoanApplication::STATUS_UNDER_REVIEW, '2026-10-02 11:00:00');
    pendingReportApproval($atZone, $bm, 'branch', 1, 'approved');
    pendingReportApproval($atZone, $zm, 'zone', 2);

    foreach ([$admf, $dmf, $ed] as $approver) {
        $loan = pendingReportLoan($branch, LoanApplication::STATUS_UNDER_REVIEW, '2026-10-03 09:00:00');
        pendingReportApproval($loan, $bm, 'branch', 1, 'approved');
        pendingReportApproval($loan, $approver, 'escalation', 2);
    }

    pendingReportLoan($branch, LoanApplication::STATUS_READY_FOR_HEAD_OFFICE, '2026-10-03 10:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_HEAD_OFFICE, '2026-10-03 11:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_NEEDS_CORRECTION, '2026-10-03 12:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_AMOUNT_APPROVAL, '2026-10-04 09:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_CANCELLATION, '2026-10-04 10:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_AWAITING_TAKEUP, '2026-10-04 11:00:00');
    pendingReportLoan($branch, LoanApplication::STATUS_PENDING_DISBURSEMENT, '2026-10-04 12:00:00');

    $empty = pendingReportBranch('Empty Branch', '0099', Area::first());
    $inactive = pendingReportBranch('Closed Branch', '0002', Area::first(), false);
    pendingReportLoan($inactive, LoanApplication::STATUS_SUBMITTED, '2026-10-02 09:00:00');

    $report = app(BranchLoanPendingReportService::class)->build(null, '2026-10-01', '2026-10-17');
    expect(collect($report['rows'])->pluck('branch_id')->all())->not->toContain($inactive->id);

    $row = pendingReportRow($branch);
    $emptyRow = pendingReportRow($empty);

    expect($row['bm'])->toBe(1)
        ->and($row['am'])->toBe(1)
        ->and($row['zm'])->toBe(1)
        ->and($row['admf'])->toBe(1)
        ->and($row['dmf'])->toBe(1)
        ->and($row['ed'])->toBe(1)
        ->and($row['rh'])->toBe(1)
        ->and($row['ho'])->toBe(1)
        ->and($row['nc'])->toBe(1)
        ->and($row['aa'])->toBe(1)
        ->and($row['pc'])->toBe(1)
        ->and($row['at'])->toBe(1)
        ->and($row['dw'])->toBe(1)
        ->and($row['total'])->toBe(13)
        ->and($emptyRow['total'])->toBe(0);
});

it('shows a branch user the same numbers head office sees for that branch', function () {
    createBranchPendingReportTables();
    ['branch' => $own] = pendingReportOrg('North', 'Sadar', 'Nazipur', '0017');
    $otherArea = Area::first();
    $other = pendingReportBranch('Other Branch', '0091', $otherArea);

    pendingReportLoan($own, LoanApplication::STATUS_PENDING_DISBURSEMENT, '2026-10-05 09:00:00');
    pendingReportLoan($own, LoanApplication::STATUS_PENDING_HEAD_OFFICE, '2026-10-05 10:00:00');
    pendingReportLoan($other, LoanApplication::STATUS_PENDING_DISBURSEMENT, '2026-10-05 11:00:00');

    $branchUser = pendingReportUser(pendingReportRole(Role::BRANCH_USER), 'branch@test.com', $own->id);
    $headOffice = pendingReportUser(pendingReportRole(Role::SUPER_ADMIN), 'ho@test.com');

    $query = ['date_from' => '2026-10-01', 'date_to' => '2026-10-17'];
    $branchPage = pendingReportPage($branchUser, $query);
    $branchPrint = pendingReportPage($branchUser, $query, 'print');
    $headOfficePage = pendingReportPage($headOffice, $query);

    expect($branchPage['rows'])->toHaveCount(1)
        ->and($branchPage['rows'][0]['branch_id'])->toBe($own->id)
        ->and($branchPage['rows'][0]['dw'])->toBe(1)
        ->and($branchPage['rows'][0]['ho'])->toBe(1)
        ->and($branchPage['rows'][0]['total'])->toBe(2)
        ->and($branchPrint['rows'])->toBe($branchPage['rows'])
        ->and($branchPrint['totals'])->toBe($branchPage['totals']);

    $headOfficeRow = collect($headOfficePage['rows'])->firstWhere('branch_id', $own->id);

    expect($headOfficeRow['dw'])->toBe($branchPage['rows'][0]['dw'])
        ->and($headOfficeRow['ho'])->toBe($branchPage['rows'][0]['ho'])
        ->and($headOfficeRow['total'])->toBe($branchPage['rows'][0]['total'])
        ->and(collect($headOfficePage['rows'])->pluck('branch_id')->all())->toContain($other->id);
});

it('forbids a branch user from opening another branch', function () {
    createBranchPendingReportTables();
    ['branch' => $own] = pendingReportOrg();
    $other = pendingReportBranch('Other Branch', '0091', Area::first());
    $branchUser = pendingReportUser(pendingReportRole(Role::BRANCH_USER), 'branch@test.com', $own->id);

    test()->actingAs($branchUser);
    $request = Request::create('/reports/branch-loan-pending', 'GET', [
        'branch_id' => $other->id,
        'date_from' => '2026-10-01',
        'date_to' => '2026-10-17',
    ]);
    $request->setUserResolver(fn () => $branchUser);
    app()->instance('request', $request);

    try {
        app(BranchLoanPendingReportController::class)->index($request);
        expect(false)->toBeTrue();
    } catch (HttpException $exception) {
        expect($exception->getStatusCode())->toBe(403);
    }
});
