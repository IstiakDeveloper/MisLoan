<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('confirm password screen can be rendered', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('password.confirm'));

    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/confirm-password')
    );
});

test('password confirmation requires authentication', function () {
    $response = $this->get(route('password.confirm'));

    $response->assertRedirect(route('login'));
});

test('personal password confirmation uses the current account without a login column', function () {
    $user = User::factory()->create(['password' => Hash::make('correct-personal-password')]);

    $this->actingAs($user)
        ->withSession(['url.intended' => '/settings/password'])
        ->post(route('password.confirm.store'), ['password' => 'correct-personal-password'])
        ->assertRedirect('/settings/password')
        ->assertSessionHasNoErrors()
        ->assertSessionHas('auth.password_confirmed_at');

    $this->get('/settings/password')->assertOk();
});

test('another account login and password cannot confirm the current user', function () {
    $current = User::factory()->create(['password' => Hash::make('current-account-password')]);
    $other = User::factory()->create(['password' => Hash::make('other-account-password')]);

    $this->actingAs($current)
        ->postJson(route('password.confirm.store'), ['login' => $other->email, 'password' => 'other-account-password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password')
        ->assertSessionMissing('auth.password_confirmed_at');
});

test('incorrect and missing confirmation passwords return validation errors', function (?string $password) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('password.confirm.store'), ['password' => $password])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password')
        ->assertSessionMissing('auth.password_confirmed_at');
})->with(['incorrect' => 'wrong-password', 'missing' => null, 'empty' => '']);

test('inactive and shared branch identities cannot confirm a personal password', function (array $attributes) {
    $user = User::factory()->create($attributes);

    $this->actingAs($user)
        ->postJson(route('password.confirm.store'), ['password' => 'password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password')
        ->assertSessionMissing('auth.password_confirmed_at');
})->with(['inactive' => [['is_active' => false]], 'branch' => [['account_type' => 'branch']]]);
