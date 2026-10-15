<?php

use App\Http\Controllers\Member\MemberCycleHubController;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

function createCycleHubBranchOrderTables(): void
{
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('loan_products');
    Schema::dropIfExists('loan_categories');
    Schema::dropIfExists('samities');
    Schema::dropIfExists('users');
    Schema::dropIfExists('roles');
    Schema::dropIfExists('branches');

    Schema::create('branches', function (Blueprint $table) {
        $table->id();
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
        $table->timestamps();
    });

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('password')->default('secret');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->boolean('has_all_access')->default(false);
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('samities', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('samity_name')->nullable();
        $table->string('samity_name_bn')->nullable();
        $table->string('samity_code')->nullable();
        $table->timestamps();
    });

    Schema::create('loan_categories', function (Blueprint $table) {
        $table->id();
        $table->string('category_name')->nullable();
        $table->string('category_name_bn')->nullable();
        $table->string('category_code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('loan_products', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('loan_category_id')->nullable();
        $table->string('product_name')->nullable();
        $table->string('product_name_bn')->nullable();
        $table->string('product_code')->nullable();
        $table->decimal('min_amount', 12, 2)->nullable();
        $table->decimal('max_amount', 12, 2)->nullable();
        $table->unsignedInteger('duration_months')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
}

beforeEach(function () {
    createCycleHubBranchOrderTables();
});

it('lists cycle hub branches in branch code order', function () {
    $role = Role::create([
        'name' => Role::SUPER_ADMIN,
        'display_name' => 'Super Admin',
    ]);

    Branch::create(['name' => 'Apple', 'code' => '0010']);
    Branch::create(['name' => 'Zeta', 'code' => '0001']);
    Branch::create(['name' => 'Mango', 'code' => '0002']);

    $user = User::create([
        'name' => 'Cycle Hub Admin',
        'email' => 'cycle-hub-order@test.com',
        'password' => 'password',
        'role_id' => $role->id,
        'has_all_access' => true,
        'is_active' => true,
    ]);

    $request = Request::create('/member/cycle-hub', 'GET');
    $request->headers->set('X-Inertia', 'true');
    $request->setUserResolver(fn () => $user);

    $response = app(MemberCycleHubController::class)->index($request);
    $page = json_decode($response->toResponse($request)->getContent(), true);

    expect($page['component'])->toBe('Member/CycleHub/Index')
        ->and(collect($page['props']['branches'])->pluck('code')->all())->toBe(['0001', '0002', '0010'])
        ->and(collect($page['props']['branches'])->pluck('name')->all())->toBe(['Zeta', 'Mango', 'Apple']);
});
