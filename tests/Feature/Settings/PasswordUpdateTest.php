<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Services\BranchAccountService;
use Illuminate\Support\Facades\Hash;

test('password update page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('user-password.edit'));

    $response->assertOk();
});

test('password can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('user-password.edit'))
        ->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('user-password.edit'));

    expect(Hash::check('new-password', $user->refresh()->password))->toBeTrue();
});

test('correct password must be provided to update password', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('user-password.edit'))
        ->put(route('user-password.update'), [
            'current_password' => 'wrong-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

    $response
        ->assertSessionHasErrors('current_password')
        ->assertRedirect(route('user-password.edit'));
});

test('branch account password change updates the branch login pin', function () {
    [$user, $branch] = createBranchAccount('12345678');

    $response = $this
        ->actingAs($user)
        ->from(route('user-password.edit'))
        ->put(route('user-password.update'), [
            'current_password' => '12345678',
            'password' => '87654321',
            'password_confirmation' => '87654321',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('user-password.edit'));

    $branch->refresh();
    expect($branch->verifyLoginPin('87654321'))->toBeTrue()
        ->and($branch->verifyLoginPin('12345678'))->toBeFalse()
        ->and(Hash::check('87654321', $user->refresh()->password))->toBeTrue();
});

test('branch account pin change from profile updates the branch login pin', function () {
    [$user, $branch] = createBranchAccount('12345678');

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->put(route('profile.password.update'), [
            'current_password' => '12345678',
            'password' => '998877',
            'password_confirmation' => '998877',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($branch->refresh()->verifyLoginPin('998877'))->toBeTrue();
});

test('branch account cannot change pin with the wrong current pin', function () {
    [$user] = createBranchAccount('12345678');

    $this
        ->actingAs($user)
        ->from(route('user-password.edit'))
        ->put(route('user-password.update'), [
            'current_password' => '00000000',
            'password' => '87654321',
            'password_confirmation' => '87654321',
        ])
        ->assertSessionHasErrors('current_password')
        ->assertRedirect(route('user-password.edit'));
});

test('branch account pin must be 4 to 12 digits', function () {
    [$user] = createBranchAccount('12345678');

    $this
        ->actingAs($user)
        ->from(route('user-password.edit'))
        ->put(route('user-password.update'), [
            'current_password' => '12345678',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('user-password.edit'));
});

/**
 * @return array{0: User, 1: Branch}
 */
function createBranchAccount(string $pin = '12345678'): array
{
    Role::query()->create([
        'name' => 'branch_user',
        'display_name' => 'Branch User',
    ]);

    $zone = Zone::query()->create([
        'name' => 'Test Zone',
        'code' => 'TZ1',
        'is_active' => true,
    ]);

    $area = Area::query()->create([
        'zone_id' => $zone->id,
        'name' => 'Test Area',
        'code' => 'TA1',
        'is_active' => true,
    ]);

    $branch = Branch::query()->create([
        'area_id' => $area->id,
        'name' => 'Test Branch',
        'code' => 'TB01',
        'is_active' => true,
        'login_pin' => Hash::make($pin),
    ]);

    $user = app(BranchAccountService::class)->ensureForBranch($branch->fresh('area'));

    return [$user, $branch->fresh()];
}
