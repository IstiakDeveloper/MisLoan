<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->withoutVite();
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $this->admin = User::factory()->create(['role_id' => $role->id]);
});

it('allows personal active administrators into financial sections without two factor setup', function () {
    $this->actingAs($this->admin);
    foreach (['/accounting', '/accounting/reports', '/loan-ledger', '/savings-ledger', '/loan-portfolio'] as $url) {
        $this->get($url)->assertOk();
    }
    $this->assertAuthenticatedAs($this->admin);
});

it('ignores saved legacy enrollment and stale proof after a password login', function () {
    $this->admin->forceFill([
        'two_factor_secret' => encrypt('JBSWY3DPEHPK3PXP'),
        'two_factor_confirmed_at' => now(),
        'two_factor_recovery_codes' => encrypt(json_encode(['legacy-code'])),
    ])->save();
    $this->withSession(['financial_mfa' => ['user_id' => 999, 'secret_hash' => 'stale']])
        ->post('/login', ['login' => $this->admin->username, 'password' => 'password'])
        ->assertRedirect('/dashboard');
    $this->assertAuthenticatedAs($this->admin);
    $this->get('/accounting')->assertOk();
});

it('still denies ordinary all-access shared branch and inactive identities from financial sections', function () {
    foreach ([
        User::factory()->create(),
        User::factory()->create(['has_all_access' => true]),
        User::factory()->create(['account_type' => 'branch', 'role_id' => $this->admin->role_id]),
        User::factory()->create(['is_active' => false, 'role_id' => $this->admin->role_id]),
    ] as $actor) {
        $this->actingAs($actor);
        foreach (['/accounting', '/accounting/reports', '/loan-ledger', '/savings-ledger', '/loan-portfolio'] as $url) {
            $this->getJson($url)->assertForbidden();
        }
    }
});

it('keeps financial sections behind authentication', function () {
    $this->get('/accounting')->assertRedirect(route('login'));
});

it('removes challenge enrollment secret and recovery endpoints', function () {
    expect(Features::enabled(Features::twoFactorAuthentication()))->toBeFalse()
        ->and(Route::has('two-factor.login'))->toBeFalse()
        ->and(Route::has('two-factor.show'))->toBeFalse();

    $this->actingAs($this->admin);
    foreach (['/two-factor-challenge', '/user/two-factor-qr-code', '/user/two-factor-secret-key', '/user/two-factor-recovery-codes'] as $url) {
        $this->getJson($url)->assertNotFound();
    }
    $this->postJson('/two-factor-challenge', ['code' => '123456'])->assertNotFound();
    $this->postJson('/user/two-factor-authentication')->assertNotFound();
    $this->postJson('/user/confirmed-two-factor-authentication', ['code' => '123456'])->assertNotFound();
    $this->get('/settings/two-factor')->assertRedirect('/profile');
});

it('still rejects short personal passwords without changing the saved password', function () {
    $this->actingAs($this->admin)->put('/settings/password', ['current_password' => 'password', 'password' => '1234', 'password_confirmation' => '1234'])->assertSessionHasErrors('password');
    expect(Hash::check('password', $this->admin->fresh()->password))->toBeTrue();
});
