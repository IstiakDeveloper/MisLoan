<?php

use App\Models\HelpGuide;
use App\Models\Role;
use App\Models\User;
use App\Services\Help\HelpGuideCatalog;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
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
    Schema::create('zones', function (Blueprint $table) {
        $table->id();
        $table->string('name')->default('Zone 1');
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('zone_id')->nullable();
        $table->string('name')->default('Area 1');
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('area_id')->nullable();
        $table->string('name')->default('Test Branch');
        $table->string('code')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });
    Schema::create('user_branches', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('branch_id');
    });
    Schema::create('user_areas', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('area_id');
    });
    Schema::create('user_zones', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->unsignedBigInteger('zone_id');
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
    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->unsignedBigInteger('assigned_officer_id')->nullable();
        $table->unsignedBigInteger('created_by')->nullable();
        $table->string('status')->default('approved');
        $table->timestamps();
    });
    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('branch_id')->nullable();
        $table->string('status')->default('draft');
        $table->timestamps();
        $table->softDeletes();
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

    (require database_path('migrations/2026_11_26_161500_create_help_guides_table.php'))->up();
});

it('filters bengali help guides strictly by user role and allows admin video updates', function () {
    $foRole = Role::create(['name' => Role::FIELD_OFFICER, 'display_name' => 'Field Officer', 'permissions' => []]);
    $bmRole = Role::create(['name' => Role::BRANCH_MANAGER, 'display_name' => 'Branch Manager', 'permissions' => []]);
    $hoRole = Role::create(['name' => Role::HEAD_OFFICE, 'display_name' => 'Head Office', 'permissions' => []]);

    $fo = User::factory()->create(['role_id' => $foRole->id, 'is_active' => true]);
    $bm = User::factory()->create(['role_id' => $bmRole->id, 'is_active' => true]);
    $ho = User::factory()->create(['role_id' => $hoRole->id, 'has_all_access' => true, 'is_active' => true]);

    $catalog = app(HelpGuideCatalog::class);

    $foGuides = $catalog->forUser($fo);
    $bmGuides = $catalog->forUser($bm);
    $hoGuides = $catalog->forUser($ho);

    expect($foGuides->pluck('part_number')->all())->toBe([1, 4, 5, 6, 7, 9])
        ->and($bmGuides->pluck('part_number')->all())->toBe([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        ->and($hoGuides)->toHaveCount(11);

    $firstGuide = HelpGuide::query()->first();

    // Field Officer cannot edit guide/video
    $this->actingAs($fo)
        ->put("/help/{$firstGuide->id}", [
            'title_bn' => $firstGuide->title_bn,
            'summary_bn' => $firstGuide->summary_bn,
            'video_url' => 'https://youtu.be/test123',
            'video_duration' => '03:15',
            'is_published' => true,
        ])
        ->assertForbidden();

    // Head Office can attach video URL
    $this->actingAs($ho)
        ->put("/help/{$firstGuide->id}", [
            'title_bn' => $firstGuide->title_bn,
            'summary_bn' => $firstGuide->summary_bn,
            'video_url' => 'https://youtu.be/test123',
            'video_duration' => '03:15',
            'is_published' => true,
        ])
        ->assertRedirect();

    expect($firstGuide->fresh()->video_url)->toBe('https://youtu.be/test123');
});
