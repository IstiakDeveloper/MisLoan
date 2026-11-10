<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use PragmaRX\Google2FA\Google2FA;

beforeEach(function () {
    $this->withoutVite();
    config(['security.financial_mfa_required' => true]);
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $this->admin = User::factory()->create(['role_id' => $role->id]);
    $this->secret = 'JBSWY3DPEHPK3PXP';
});

it('requires confirmed enrollment and leaves MFA setup accessible', function () {
    $this->actingAs($this->admin)->get('/accounting')->assertRedirect(route('two-factor.show'));
    $this->getJson('/accounting/reports')->assertForbidden()->assertJsonPath('setup_url', route('two-factor.show'));
    $this->withSession(['auth.password_confirmed_at' => time()])->get('/settings/two-factor')->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->where('financialMfaRequired', true));
});

it('requires a verified session even when MFA is already enabled', function () {
    $this->admin->forceFill(['two_factor_secret' => encrypt($this->secret), 'two_factor_confirmed_at' => now()])->save();
    $this->actingAs($this->admin)->getJson('/accounting')->assertForbidden();
    $this->get('/accounting')->assertRedirect(route('login'));
    $this->assertGuest();
});

it('accepts a real enrollment confirmation and invalidates proof after secret rotation', function () {
    $this->admin->forceFill(['two_factor_secret' => encrypt($this->secret)])->save();
    $code = (new Google2FA)->getCurrentOtp($this->secret);
    $this->actingAs($this->admin)->withSession(['auth.password_confirmed_at' => time()])->post('/user/confirmed-two-factor-authentication', ['code' => $code])->assertSessionHasNoErrors();
    $this->get('/accounting')->assertOk();
    $this->admin->forceFill(['two_factor_secret' => encrypt('KRSXG5DSNFXGOIDB')])->save();
    $this->getJson('/accounting')->assertForbidden();
});

it('records valid recovery-code login proof and consumes the recovery code', function () {
    $this->admin->forceFill(['two_factor_secret' => encrypt($this->secret), 'two_factor_confirmed_at' => now(), 'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code-123']))])->save();
    $this->post('/login', ['login' => $this->admin->username, 'password' => 'password'])->assertRedirect(route('two-factor.login'));
    $this->post('/two-factor-challenge', ['recovery_code' => 'recovery-code-123'])->assertSessionHasNoErrors();
    $this->get('/accounting')->assertOk();
    expect(decrypt($this->admin->fresh()->two_factor_recovery_codes))->not->toContain('recovery-code-123');
});

it('rejects invalid challenge codes and ordinary staff from financial workspaces', function () {
    $this->admin->forceFill(['two_factor_secret' => encrypt($this->secret), 'two_factor_confirmed_at' => now()])->save();
    $this->post('/login', ['login' => $this->admin->username, 'password' => 'password']);
    $this->postJson('/two-factor-challenge', ['code' => 'invalid'])->assertUnprocessable();
    $this->assertGuest();
    $this->actingAs(User::factory()->create())->getJson('/accounting')->assertForbidden();
});

it('rejects four-character personal passwords without changing an existing password', function () {
    $this->actingAs($this->admin)->put('/settings/password', ['current_password' => 'password', 'password' => '1234', 'password_confirmation' => '1234'])->assertSessionHasErrors('password');
    expect(Hash::check('password', $this->admin->fresh()->password))->toBeTrue();
});
