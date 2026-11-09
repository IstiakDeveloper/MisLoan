<?php

use App\Models\User;
use Illuminate\Support\Facades\Notification;

it('does not send email-verification notifications through a disabled endpoint', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create();
    $this->actingAs($user)->post('/email/verification-notification')->assertNotFound();
    Notification::assertNothingSent();
});
