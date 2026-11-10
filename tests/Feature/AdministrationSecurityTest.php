<?php

use App\Models\Role;
use App\Models\User;

it('prevents head-office identities from escalating roles or taking over privileged accounts', function () {
    $super = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Super administrator']);
    $target = User::factory()->create(['role_id' => $super->id]);
    $actor = User::factory()->create();
    $this->actingAs($actor)->post('/users', ['name' => 'Escalation', 'username' => 'escalate', 'email' => 'escalate@example.com', 'password' => 'password123', 'password_confirmation' => 'password123', 'role_id' => $super->id])->assertForbidden();
    $this->put('/users/'.$target->id, ['role_id' => $actor->role_id])->assertForbidden();
    $this->post('/users/'.$target->id.'/reset-password', ['password' => 'password123', 'password_confirmation' => 'password123'])->assertForbidden();
    $this->post('/roles', ['name' => 'custom_admin'])->assertForbidden();
    $this->post('/user-sessions/destroy-user/'.$target->id)->assertForbidden();
    expect(User::where('username', 'escalate')->exists())->toBeFalse()->and($target->fresh()->role_id)->toBe($super->id);
});

it('does not treat all-access or shared branch flags as personal administrative authority', function () {
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    foreach ([User::factory()->create(['has_all_access' => true]), User::factory()->create(['account_type' => 'branch', 'role_id' => $role->id]), User::factory()->create(['role_id' => $role->id, 'is_active' => false])] as $actor) {
        $this->actingAs($actor)->post('/users', [])->assertForbidden();
    }
});

it('allows personal administrators to reach account validation without an MFA setup redirect', function () {
    $role = Role::create(['name' => Role::SUPER_ADMIN, 'display_name' => 'Admin']);
    $actor = User::factory()->create(['role_id' => $role->id]);
    $before = User::count();
    $this->actingAs($actor)->postJson('/users', [])->assertUnprocessable()->assertJsonValidationErrors('name');
    expect(User::count())->toBe($before);
});
