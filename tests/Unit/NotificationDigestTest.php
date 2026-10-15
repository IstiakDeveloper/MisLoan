<?php

use App\Mail\DigestNotificationMail;
use App\Mail\WorkflowNotificationMail;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('users');

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->nullable();
        $table->string('password')->default('secret');
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->string('type');
        $table->string('title');
        $table->text('message');
        $table->string('notifiable_type')->nullable();
        $table->unsignedBigInteger('notifiable_id')->nullable();
        $table->json('data')->nullable();
        $table->string('action_url')->nullable();
        $table->boolean('is_read')->default(false);
        $table->timestamp('read_at')->nullable();
        $table->boolean('is_sent_email')->default(false);
        $table->timestamp('email_sent_at')->nullable();
        $table->timestamps();
    });
});

test('digest notification mail is not queued', function () {
    expect(new DigestNotificationMail('Officer', [], 'http://example.test/notifications', 0))
        ->not->toBeInstanceOf(ShouldQueue::class);
});

test('routine notifications are stored without sending email', function () {
    Mail::fake();

    $user = insertDigestUser();

    app(NotificationService::class)->send(
        users: $user,
        type: 'loan_application',
        title: 'নতুন ঋণ আবেদন জমা হয়েছে',
        message: 'ঋণ আবেদন নং LA-1 ব্রাঞ্চে জমা দেওয়া হয়েছে।',
        details: ['আবেদন নং' => 'LA-1'],
    );

    Mail::assertNothingSent();

    $notification = Notification::query()->first();
    expect($notification)->not->toBeNull()
        ->and($notification->is_sent_email)->toBeFalse()
        ->and($notification->user_id)->toBe($user->id)
        ->and($notification->title)->toBe('নতুন ঋণ আবেদন জমা হয়েছে');
});

test('immediate notifications email the user right away', function () {
    Mail::fake();
    $this->withoutDefer();

    $user = insertDigestUser();

    app(NotificationService::class)->send(
        users: $user,
        type: 'loan_application',
        title: 'ঋণ আবেদন বাতিল করা হয়েছে',
        message: 'ঋণ আবেদন নং LA-9 বাতিল করা হয়েছে।',
        immediateEmail: true,
    );

    Mail::assertSent(WorkflowNotificationMail::class, 1);

    expect(Notification::query()->first()->is_sent_email)->toBeTrue();
});

test('digest command sends one summary email and marks those notifications sent', function () {
    Mail::fake();

    $user = insertDigestUser(['email' => 'manager@example.com', 'name' => 'Branch Manager']);
    $invalid = insertDigestUser(['email' => 'not-an-email', 'name' => 'Bad Email']);
    $inactive = insertDigestUser(['email' => 'inactive@example.com', 'name' => 'Inactive', 'is_active' => false]);

    foreach (range(1, 10) as $number) {
        insertDigestNotification($user, 'loan_application', 'নতুন ঋণ আবেদন জমা হয়েছে', "LA-{$number}");
    }

    insertDigestNotification($user, 'member_admission', 'নতুন সদস্য আবেদন জমা হয়েছে', 'MA-1');
    insertDigestNotification($user, 'member_admission', 'নতুন সদস্য আবেদন জমা হয়েছে', 'MA-2');
    insertDigestNotification($user, 'loan_application', 'Already emailed', 'LA-OLD', true);
    insertDigestNotification($invalid, 'loan_application', 'নতুন ঋণ আবেদন জমা হয়েছে', 'LA-BAD');
    insertDigestNotification($inactive, 'loan_application', 'নতুন ঋণ আবেদন জমা হয়েছে', 'LA-OFF');

    $this->artisan('notifications:digest')
        ->expectsOutputToContain('Sent digest email to 1 user(s).')
        ->assertSuccessful();

    Mail::assertSent(DigestNotificationMail::class, function (DigestNotificationMail $mail) use ($user) {
        $loan = $mail->sections[0];
        $admission = $mail->sections[1];

        return $mail->hasTo($user->email)
            && $mail->total === 12
            && $loan['label'] === 'ঋণ আবেদন'
            && $loan['groups'][0]['count'] === 10
            && $loan['groups'][0]['samples'] === ['LA-1', 'LA-2', 'LA-3', 'LA-4', 'LA-5', 'LA-6', 'LA-7', 'LA-8']
            && $loan['groups'][0]['remaining'] === 2
            && $admission['label'] === 'সদস্য আবেদন'
            && $admission['groups'][0]['count'] === 2
            && $admission['groups'][0]['remaining'] === 0
            && $mail->actionUrl === route('notifications.index');
    });

    Mail::assertSent(DigestNotificationMail::class, 1);

    $html = Mail::sent(DigestNotificationMail::class)->first()->render();
    expect($html)->toContain('আর 2টি')->toContain('LA-1')->toContain('সব নোটিফিকেশন দেখুন');

    expect(Notification::query()->where('user_id', $user->id)->where('is_sent_email', false)->count())->toBe(0)
        ->and(Notification::query()->where('user_id', $invalid->id)->where('is_sent_email', false)->count())->toBe(1)
        ->and(Notification::query()->where('user_id', $inactive->id)->where('is_sent_email', false)->count())->toBe(1);
});

test('digest command leaves notifications unsent when mail fails', function () {
    Event::listen(MessageSending::class, function () {
        throw new RuntimeException('smtp down');
    });

    $user = insertDigestUser();
    insertDigestNotification($user, 'loan_application', 'নতুন ঋণ আবেদন জমা হয়েছে', 'LA-1');

    $this->artisan('notifications:digest')
        ->expectsOutputToContain('Failed for 1 user(s).')
        ->assertSuccessful();

    expect(Notification::query()->first()->is_sent_email)->toBeFalse();
});

function insertDigestUser(array $overrides = []): User
{
    $id = DB::table('users')->insertGetId(array_merge([
        'name' => 'Officer',
        'email' => 'officer@example.com',
        'password' => 'secret',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ], $overrides));

    return User::query()->findOrFail($id);
}

function insertDigestNotification(User $user, string $type, string $title, string $applicationNo, bool $sent = false): void
{
    Notification::query()->create([
        'user_id' => $user->id,
        'type' => $type,
        'title' => $title,
        'message' => $title.' '.$applicationNo,
        'data' => ['details' => ['আবেদন নং' => $applicationNo]],
        'is_read' => false,
        'is_sent_email' => $sent,
        'email_sent_at' => $sent ? now() : null,
    ]);
}
