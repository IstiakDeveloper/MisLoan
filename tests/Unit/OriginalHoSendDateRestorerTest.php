<?php

use App\Models\LoanApplication;
use App\Models\MemberAdmission;
use App\Models\User;
use App\Services\OriginalHoSendDateRestorer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    Schema::dropIfExists('notifications');
    Schema::dropIfExists('loan_applications');
    Schema::dropIfExists('member_admissions');
    Schema::dropIfExists('users');

    Schema::create('users', function (Blueprint $table) {
        $table->id();
        $table->string('name')->default('HO');
        $table->string('email')->unique();
        $table->string('password')->default('secret');
        $table->boolean('is_active')->default(true);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('member_admissions', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->dateTime('submitted_at')->nullable();
        $table->string('status')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('loan_applications', function (Blueprint $table) {
        $table->id();
        $table->string('application_no')->nullable();
        $table->dateTime('submitted_at')->nullable();
        $table->string('status')->nullable();
        $table->decimal('requested_amount', 12, 2)->default(0);
        $table->timestamps();
        $table->softDeletes();
    });

    Schema::create('notifications', function (Blueprint $table) {
        $table->id();
        $table->unsignedBigInteger('user_id');
        $table->string('type')->nullable();
        $table->string('title');
        $table->text('message')->nullable();
        $table->string('notifiable_type')->nullable();
        $table->unsignedBigInteger('notifiable_id')->nullable();
        $table->json('data')->nullable();
        $table->timestamps();
    });
});

it('moves an admission back to the original head office send date', function () {
    $user = User::create(['name' => 'HO', 'email' => 'ho-date@test.com', 'is_active' => true]);
    $sentAt = now()->subDay()->setTime(13, 43, 54);
    $repliedAt = now()->setTime(10, 0, 0);

    $admission = MemberAdmission::withoutEvents(fn () => MemberAdmission::create([
        'application_no' => '0017888834',
        'status' => 'pending_head_office',
        'submitted_at' => $repliedAt,
    ]));

    DB::table('notifications')->insert([
        'user_id' => $user->id,
        'type' => 'member_admission',
        'title' => OriginalHoSendDateRestorer::ADMISSION_SEND_TITLE,
        'message' => 'পাঠানো হয়েছে',
        'notifiable_type' => MemberAdmission::class,
        'notifiable_id' => $admission->id,
        'created_at' => $sentAt,
        'updated_at' => $sentAt,
    ]);

    $report = app(OriginalHoSendDateRestorer::class)->restore();

    expect($report['admissions'])->toBe(1)
        ->and($admission->fresh()->submitted_at->toDateTimeString())->toBe($sentAt->toDateTimeString());
});

it('moves a loan back to the original head office send date', function () {
    $user = User::create(['name' => 'HO', 'email' => 'ho-loan-date@test.com', 'is_active' => true]);
    $sentAt = now()->subDay()->setTime(11, 0, 0);

    $loan = LoanApplication::create([
        'application_no' => 'LN-009',
        'status' => LoanApplication::STATUS_PENDING_HEAD_OFFICE,
        'submitted_at' => now(),
        'requested_amount' => 10000,
    ]);

    DB::table('notifications')->insert([
        'user_id' => $user->id,
        'type' => 'loan_application',
        'title' => OriginalHoSendDateRestorer::LOAN_SEND_TITLE,
        'message' => 'পাঠানো হয়েছে',
        'notifiable_type' => LoanApplication::class,
        'notifiable_id' => $loan->id,
        'created_at' => $sentAt,
        'updated_at' => $sentAt,
    ]);

    $report = app(OriginalHoSendDateRestorer::class)->restore();

    expect($report['loans'])->toBe(1)
        ->and($loan->fresh()->submitted_at->toDateTimeString())->toBe($sentAt->toDateTimeString());
});

it('does not change an admission that is already on the original send date', function () {
    $user = User::create(['name' => 'HO', 'email' => 'ho-same@test.com', 'is_active' => true]);
    $sentAt = now()->subDay()->setTime(9, 0, 0);

    $admission = MemberAdmission::withoutEvents(fn () => MemberAdmission::create([
        'application_no' => '0017000001',
        'status' => 'pending_head_office',
        'submitted_at' => $sentAt,
    ]));

    DB::table('notifications')->insert([
        'user_id' => $user->id,
        'type' => 'member_admission',
        'title' => OriginalHoSendDateRestorer::ADMISSION_SEND_TITLE,
        'message' => 'পাঠানো হয়েছে',
        'notifiable_type' => MemberAdmission::class,
        'notifiable_id' => $admission->id,
        'created_at' => $sentAt,
        'updated_at' => $sentAt,
    ]);

    $report = app(OriginalHoSendDateRestorer::class)->restore();

    expect($report['admissions'])->toBe(0)
        ->and($admission->fresh()->submitted_at->toDateTimeString())->toBe($sentAt->toDateTimeString());
});
