<?php

use App\Mail\WorkflowNotificationMail;
use App\Models\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('failed_jobs');
    Schema::dropIfExists('jobs');
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('users');

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->string('password')->default('secret');
        $table->unsignedBigInteger('role_id')->nullable();
        $table->boolean('is_active')->default(true);
        $table->timestamps();
    });

    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->string('type')->nullable();
        $table->string('title')->nullable();
        $table->text('message')->nullable();
        $table->string('notifiable_type')->nullable();
        $table->unsignedBigInteger('notifiable_id')->nullable();
        $table->text('data')->nullable();
        $table->string('action_url')->nullable();
        $table->boolean('is_read')->default(false);
        $table->timestamp('read_at')->nullable();
        $table->boolean('is_sent_email')->default(false);
        $table->timestamp('email_sent_at')->nullable();
        $table->timestamps();
    });

    Schema::create('jobs', function (Blueprint $table) {
        $table->id();
        $table->string('queue');
        $table->longText('payload');
        $table->unsignedTinyInteger('attempts');
        $table->unsignedInteger('reserved_at')->nullable();
        $table->unsignedInteger('available_at');
        $table->unsignedInteger('created_at');
    });

    Schema::create('failed_jobs', function (Blueprint $table) {
        $table->id();
        $table->string('uuid')->unique();
        $table->text('connection');
        $table->text('queue');
        $table->longText('payload');
        $table->longText('exception');
        $table->timestamp('failed_at')->useCurrent();
    });
});

test('workflow notification mail is not queued', function () {
    expect(new WorkflowNotificationMail('Title', 'Message'))
        ->not->toBeInstanceOf(ShouldQueue::class);
});

test('prune command deletes old notifications and mail jobs only', function () {
    $userId = DB::table('users')->insertGetId([
        'name' => 'Officer',
        'email' => 'officer@example.com',
        'password' => 'secret',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $old = Notification::create([
        'user_id' => $userId,
        'type' => 'loan_application',
        'title' => 'Old',
        'message' => 'Older than retention',
        'is_read' => false,
    ]);
    $old->forceFill([
        'created_at' => now()->subDays(16),
        'updated_at' => now()->subDays(16),
    ])->save();

    $recent = Notification::create([
        'user_id' => $userId,
        'type' => 'loan_application',
        'title' => 'Recent',
        'message' => 'Keep this',
        'is_read' => false,
    ]);

    $now = time();
    DB::table('jobs')->insert([
        [
            'queue' => 'default',
            'payload' => json_encode(['displayName' => WorkflowNotificationMail::class]),
            'attempts' => 0,
            'available_at' => $now,
            'created_at' => $now,
        ],
        [
            'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Jobs\\SomeOtherJob']),
            'attempts' => 0,
            'available_at' => $now,
            'created_at' => $now,
        ],
    ]);

    DB::table('failed_jobs')->insert([
        [
            'uuid' => (string) str()->uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Mail\\UserCredentialsMail']),
            'exception' => 'mail failed',
            'failed_at' => now(),
        ],
        [
            'uuid' => (string) str()->uuid(),
            'connection' => 'database',
            'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Jobs\\SomeOtherJob']),
            'exception' => 'other failed',
            'failed_at' => now(),
        ],
    ]);

    $this->artisan('notifications:prune', ['--days' => 15])
        ->assertSuccessful();

    expect(Notification::find($old->id))->toBeNull();
    expect(Notification::find($recent->id))->not->toBeNull();
    expect(DB::table('jobs')->count())->toBe(1);
    expect(DB::table('jobs')->value('payload'))->toContain('SomeOtherJob');
    expect(DB::table('failed_jobs')->count())->toBe(1);
    expect(DB::table('failed_jobs')->value('payload'))->toContain('SomeOtherJob');
});
